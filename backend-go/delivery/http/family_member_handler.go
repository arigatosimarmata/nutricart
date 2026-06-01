package http

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/nutricart/backend/domain"
	"github.com/nutricart/backend/pkg/logger"
	"go.uber.org/zap"
)

type FamilyMemberHandler struct {
	fmu domain.FamilyMemberUsecase
}

// NewFamilyMemberHandler mounts matching endpoints for handling profiles and safe auditing logs
func NewFamilyMemberHandler(app *fiber.App, fmu domain.FamilyMemberUsecase) {
	handler := &FamilyMemberHandler{fmu: fmu}

	v1 := app.Group("/api/v1/family-members")
	v1.Get("/", handler.GetAllMembers)
	v1.Post("/", handler.AddMember)
	v1.Delete("/:id", handler.DeleteMember)
}

// LogPayloadSecurelyGo audits server payloads securely, hashing fields categorized under credential terms
func LogPayloadSecurelyGo(actionName string, payload map[string]interface{}) {
	if payload == nil {
		logger.Info("[AUDIT LOG] Payload is nil for action", zap.String("action", actionName))
		return
	}

	cloned := make(map[string]interface{})
	for k, v := range payload {
		cloned[k] = v
	}

	credentialTerms := []string{"password", "token", "secret", "credential", "key", "pin", "auth", "id_token", "refresh_token"}

	var clean func(m map[string]interface{})
	clean = func(m map[string]interface{}) {
		for key, val := range m {
			isCredential := false
			for _, term := range credentialTerms {
				if strings.Contains(strings.ToLower(key), term) {
					isCredential = true
					break
				}
			}

			if isCredential {
				if strVal, ok := val.(string); ok && len(strVal) > 0 {
					hash := sha256.New()
					hash.Write([]byte(strVal))
					hashedValue := hex.EncodeToString(hash.Sum(nil))
					if len(hashedValue) > 16 {
						hashedValue = hashedValue[:16] + "..."
					}
					m[key] = "[HASHED: " + hashedValue + "]"
				} else {
					m[key] = "[MUTED CREDENTIAL]"
				}
			} else if subMap, ok := val.(map[string]interface{}); ok {
				clean(subMap)
			} else if sliceVal, ok := val.([]interface{}); ok {
				for _, item := range sliceVal {
					if itemMap, ok := item.(map[string]interface{}); ok {
						clean(itemMap)
					}
				}
			}
		}
	}

	clean(cloned)
	logger.Info("[AUDIT LOG] Executed HTTP Action: "+actionName, zap.Any("payload", cloned))
}

func (h *FamilyMemberHandler) GetAllMembers(c *fiber.Ctx) error {
	members, err := h.fmu.GetAllMembers(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":     "error",
			"error_code": "RETRIEVAL_FAILED",
			"message":    err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status": "success",
		"data":   members,
	})
}

func (h *FamilyMemberHandler) AddMember(c *fiber.Ctx) error {
	// Parse general map first for Audit Logger securely
	var auditMap map[string]interface{}
	if err := c.BodyParser(&auditMap); err == nil {
		LogPayloadSecurelyGo("ADD_FAMILY_MEMBER", auditMap)
	}

	var member domain.FamilyMember
	if err := c.BodyParser(&member); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "INVALID_JSON",
			"message":    "JSON payload data profile keluarga tidak valid.",
		})
	}

	if err := h.fmu.RegisterMember(c.UserContext(), &member); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "REGISTRATION_FAILED",
			"message":    err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"status": "success",
		"data":   member,
	})
}

func (h *FamilyMemberHandler) DeleteMember(c *fiber.Ctx) error {
	idStr := c.Params("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":     "error",
			"error_code": "INVALID_ID",
			"message":    "ID anggota keluarga tidak valid (harus integer).",
		})
	}

	// Logging specific resource transaction
	logger.Info("[AUDIT LOG] Request to DELETE family member profile", zap.Uint("member_id", id))

	if err := h.fmu.DeleteMember(c.UserContext(), id); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":     "error",
			"error_code": "DELETE_FAILED",
			"message":    err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status": "success",
		"data":   id,
		"message": "Profil anggota keluarga berhasil dihapus.",
	})
}

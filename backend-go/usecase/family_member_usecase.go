package usecase

import (
	"context"
	"errors"
	"fmt"
	"github.com/nutricart/backend/domain"
)

type familyMemberUsecase struct {
	repo domain.FamilyMemberRepository
}

// NewFamilyMemberUsecase creates instance of FamilyMemberUsecase
func NewFamilyMemberUsecase(repo domain.FamilyMemberRepository) domain.FamilyMemberUsecase {
	return &familyMemberUsecase{repo: repo}
}

func (u *familyMemberUsecase) RegisterMember(ctx context.Context, member *domain.FamilyMember) error {
	// Fail-Fast: Domain Invariant Validations
	if member.Name == "" {
		return errors.New("nama anggota keluarga tidak boleh kosong")
	}
	if member.Age <= 0 || member.Age > 120 {
		return errors.New("usia anggota keluarga tidak valid (harus di antara 1 dan 120)")
	}
	if member.WeightKg <= 0 {
		return errors.New("berat badan harus lebih besar dari 0")
	}
	if member.HeightCm <= 0 {
		return errors.New("tinggi badan harus lebih besar dari 0")
	}
	if member.Gender != "Pria" && member.Gender != "Wanita" {
		return errors.New("jenis kelamin harus 'Pria' atau 'Wanita'")
	}

	if err := u.repo.Create(ctx, member); err != nil {
		return fmt.Errorf("usecase.RegisterMember failed: %w", err)
	}
	return nil
}

func (u *familyMemberUsecase) GetAllMembers(ctx context.Context) ([]domain.FamilyMember, error) {
	members, err := u.repo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("usecase.GetAllMembers failed: %w", err)
	}
	return members, nil
}

func (u *familyMemberUsecase) GetMemberByID(ctx context.Context, id uint) (*domain.FamilyMember, error) {
	if id == 0 {
		return nil, errors.New("ID anggota keluarga tidak valid")
	}
	member, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("usecase.GetMemberByID failed: %w", err)
	}
	if member == nil {
		return nil, fmt.Errorf("anggota keluarga dengan ID %d tidak ditemukan", id)
	}
	return member, nil
}

func (u *familyMemberUsecase) UpdateMember(ctx context.Context, member *domain.FamilyMember) error {
	// Fail-Fast validations
	if member.ID == 0 {
		return errors.New("ID anggota keluarga harus dilampirkan untuk diperbarui")
	}
	if member.Name == "" {
		return errors.New("nama tidak boleh kosong")
	}
	if member.WeightKg <= 0 || member.HeightCm <= 0 {
		return errors.New("berat badan dan tinggi badan harus valid")
	}

	// Verify existence
	exists, err := u.repo.FindByID(ctx, member.ID)
	if err != nil {
		return fmt.Errorf("usecase.UpdateMember checking failed: %w", err)
	}
	if exists == nil {
		return fmt.Errorf("anggota keluarga dengan ID %d tidak ditemukan", member.ID)
	}

	if err := u.repo.Update(ctx, member); err != nil {
		return fmt.Errorf("usecase.UpdateMember failed: %w", err)
	}
	return nil
}

func (u *familyMemberUsecase) DeleteMember(ctx context.Context, id uint) error {
	if id == 0 {
		return errors.New("ID anggota keluarga tidak valid")
	}
	exists, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("usecase.DeleteMember checking failed: %w", err)
	}
	if exists == nil {
		return fmt.Errorf("anggota keluarga dengan ID %d tidak ditemukan", id)
	}

	if err := u.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("usecase.DeleteMember failed: %w", err)
	}
	return nil
}

package mysql

import (
	"context"
	"fmt"
	"github.com/nutricart/backend/domain"
	"gorm.io/gorm"
)

type mysqlFamilyMemberRepository struct {
	db *gorm.DB
}

// NewFamilyMemberRepository creates instance of FamilyMemberRepository
func NewFamilyMemberRepository(db *gorm.DB) domain.FamilyMemberRepository {
	return &mysqlFamilyMemberRepository{db: db}
}

func (r *mysqlFamilyMemberRepository) Create(ctx context.Context, member *domain.FamilyMember) error {
	if err := r.db.WithContext(ctx).Create(member).Error; err != nil {
		return fmt.Errorf("FamilyMemberRepository.Create failed: %w", err)
	}
	return nil
}

func (r *mysqlFamilyMemberRepository) FindAll(ctx context.Context) ([]domain.FamilyMember, error) {
	var members []domain.FamilyMember
	if err := r.db.WithContext(ctx).Find(&members).Error; err != nil {
		return nil, fmt.Errorf("FamilyMemberRepository.FindAll failed: %w", err)
	}
	return members, nil
}

func (r *mysqlFamilyMemberRepository) FindByID(ctx context.Context, id uint) (*domain.FamilyMember, error) {
	var member domain.FamilyMember
	if err := r.db.WithContext(ctx).First(&member, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("FamilyMemberRepository.FindByID failed (id=%d): %w", id, err)
	}
	return &member, nil
}

func (r *mysqlFamilyMemberRepository) Update(ctx context.Context, member *domain.FamilyMember) error {
	if err := r.db.WithContext(ctx).Save(member).Error; err != nil {
		return fmt.Errorf("FamilyMemberRepository.Update failed (id=%d): %w", member.ID, err)
	}
	return nil
}

func (r *mysqlFamilyMemberRepository) Delete(ctx context.Context, id uint) error {
	if err := r.db.WithContext(ctx).Delete(&domain.FamilyMember{}, id).Error; err != nil {
		return fmt.Errorf("FamilyMemberRepository.Delete failed (id=%d): %w", id, err)
	}
	return nil
}

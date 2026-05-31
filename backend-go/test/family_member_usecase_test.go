package test

import (
	"context"
	"errors"
	"testing"

	"github.com/nutricart/backend/domain"
	"github.com/nutricart/backend/usecase"
)

// MockFamilyMemberRepository is a mock implementation of domain.FamilyMemberRepository
type MockFamilyMemberRepository struct {
	members []domain.FamilyMember
	err     error
}

func (m *MockFamilyMemberRepository) Create(ctx context.Context, member *domain.FamilyMember) error {
	if m.err != nil {
		return m.err
	}
	member.ID = uint(len(m.members) + 1)
	m.members = append(m.members, *member)
	return nil
}

func (m *MockFamilyMemberRepository) FindAll(ctx context.Context) ([]domain.FamilyMember, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.members, nil
}

func (m *MockFamilyMemberRepository) FindByID(ctx context.Context, id uint) (*domain.FamilyMember, error) {
	if m.err != nil {
		return nil, m.err
	}
	for _, member := range m.members {
		if member.ID == id {
			return &member, nil
		}
	}
	return nil, nil
}

func (m *MockFamilyMemberRepository) Update(ctx context.Context, member *domain.FamilyMember) error {
	if m.err != nil {
		return m.err
	}
	for i, existing := range m.members {
		if existing.ID == member.ID {
			m.members[i] = *member
			return nil
		}
	}
	return errors.New("not found")
}

func (m *MockFamilyMemberRepository) Delete(ctx context.Context, id uint) error {
	if m.err != nil {
		return m.err
	}
	for i, member := range m.members {
		if member.ID == id {
			m.members = append(m.members[:i], m.members[i+1:]...)
			return nil
		}
	}
	return errors.New("not found")
}

func TestRegisterMember_Valid(t *testing.T) {
	repo := &MockFamilyMemberRepository{}
	uc := usecase.NewFamilyMemberUsecase(repo)

	member := &domain.FamilyMember{
		Name:     "Bu Dewi",
		Gender:   "Wanita",
		Age:      35,
		WeightKg: 55.0,
		HeightCm: 160.0,
	}

	err := uc.RegisterMember(context.Background(), member)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(repo.members) != 1 {
		t.Errorf("expected 1 member in repo, got %d", len(repo.members))
	}

	if repo.members[0].Name != "Bu Dewi" {
		t.Errorf("expected name 'Bu Dewi', got '%s'", repo.members[0].Name)
	}
}

func TestRegisterMember_InvalidAge(t *testing.T) {
	repo := &MockFamilyMemberRepository{}
	uc := usecase.NewFamilyMemberUsecase(repo)

	member := &domain.FamilyMember{
		Name:     "Anak 1",
		Gender:   "Pria",
		Age:      -5, // Invalid age
		WeightKg: 25.0,
		HeightCm: 120.0,
	}

	err := uc.RegisterMember(context.Background(), member)
	if err == nil {
		t.Fatal("expected validation error for negative age, got nil")
	}

	expectedMsg := "usia anggota keluarga tidak valid"
	if err.Error() == "" || !containsRegexString(err.Error(), expectedMsg) {
		t.Errorf("expected error containing '%s', got '%v'", expectedMsg, err)
	}
}

func containsRegexString(s, substr string) bool {
	// Simple string contains helper
	return len(s) >= len(substr) && (s == substr || s[0:len(substr)] == substr || stringsContains(s, substr))
}

func stringsContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

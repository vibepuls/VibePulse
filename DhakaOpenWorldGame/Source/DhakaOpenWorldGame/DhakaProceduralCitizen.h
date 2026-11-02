#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaProceduralCitizen.generated.h"

class USceneComponent;
class UStaticMeshComponent;
class UStaticMesh;

UENUM(BlueprintType)
enum class EDhakaClothingStyle : uint8 { ShirtTrousers, TShirtJeans, Panjabi, Saree, SalwarKameez, SchoolUniform, OfficeWear, Traditional, Jacket };

USTRUCT(BlueprintType)
struct FDhakaCitizenAppearance
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float Height = 1.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float Build = 1.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FLinearColor Skin = FLinearColor(.46f,.29f,.19f,1.f);
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FLinearColor HairColor = FLinearColor(.025f,.02f,.018f,1.f);
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FLinearColor TopColor = FLinearColor(.1f,.28f,.62f,1.f);
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FLinearColor BottomColor = FLinearColor(.09f,.10f,.12f,1.f);
    UPROPERTY(EditAnywhere, BlueprintReadWrite) EDhakaClothingStyle Clothing = EDhakaClothingStyle::ShirtTrousers;
};

/** Seeded procedural citizen with modular body/clothing parts and lightweight walk cycle. */
UCLASS(BlueprintType)
class DHAKAOPENWORLDGAME_API ADhakaProceduralCitizen : public AActor
{
    GENERATED_BODY()
public:
    ADhakaProceduralCitizen();
    virtual void OnConstruction(const FTransform& Transform) override;
    virtual void Tick(float DeltaSeconds) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Citizen") FDhakaCitizenAppearance Appearance;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Citizen", meta=(ClampMin="0",ClampMax="2147483647")) int32 AppearanceSeed = 2026;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Citizen|Animation") bool bAnimateWalk = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Citizen|Animation", meta=(ClampMin="0",ClampMax="500")) float WalkSpeed = 115.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Citizen|AI") bool bWanderLocally = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Citizen|AI", meta=(ClampMin="100",ClampMax="10000")) float WanderRadius = 1200.f;

private:
    UPROPERTY(VisibleAnywhere) TObjectPtr<USceneComponent> SceneRoot;
    UPROPERTY(Transient) TArray<TObjectPtr<UStaticMeshComponent>> Parts;
    UPROPERTY(Transient) TObjectPtr<UStaticMesh> Cube;
    UPROPERTY(Transient) TObjectPtr<UStaticMesh> Sphere;
    UPROPERTY(Transient) TObjectPtr<UStaticMesh> Cylinder;
    float Phase=0.f;
    FVector Home=FVector::ZeroVector;
    FVector WanderTarget=FVector::ZeroVector;
    UStaticMeshComponent* Part(const TCHAR* Name,UStaticMesh* Mesh,FVector Location,FVector Scale,FLinearColor Color,FRotator Rotation=FRotator::ZeroRotator);
    void ClearParts();
    void BuildAppearance(FRandomStream& Random);
};

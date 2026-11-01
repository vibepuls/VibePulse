#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaCityGenerator.generated.h"

class USceneComponent;
class UMaterialInterface;

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaCityGenerator : public AActor
{
    GENERATED_BODY()
public:
    ADhakaCityGenerator();
    virtual void OnConstruction(const FTransform& Transform) override;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="City", meta=(ClampMin="4",ClampMax="80")) int32 GridBlocks = 18;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="City", meta=(ClampMin="600",ClampMax="500000")) float CityExtent = 320000.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="City") int32 RandomSeed = 2026;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="City") bool bGenerateRoads = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="City") bool bGenerateBuildings = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="City") bool bGenerateStreetProps = true;
private:
    UPROPERTY(VisibleAnywhere) TObjectPtr<USceneComponent> SceneRoot;
    UPROPERTY(Transient) TObjectPtr<UMaterialInterface> VertexColorMaterial;
    UPROPERTY(Transient) TArray<TObjectPtr<class UProceduralMeshComponent>> GeneratedMeshes;
    void ClearGenerated();
    void AddBoxMesh(const FVector& Center, const FVector& Size, const FLinearColor& Color, bool bCollision);
    void AddBuildingMesh(float X, float Y, float Width, float Depth, float Height, const FLinearColor& Color, FRandomStream& Random);
};

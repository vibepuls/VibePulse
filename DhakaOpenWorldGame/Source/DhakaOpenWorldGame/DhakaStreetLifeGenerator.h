#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaStreetLifeGenerator.generated.h"

class USceneComponent;
class UStaticMesh;
class UMaterialInstanceDynamic;
class UStaticMeshComponent;

/** Procedural Dhaka roadside dressing: vendors, footpath furniture, poles, wires, trees and street clutter. */
UCLASS(BlueprintType)
class DHAKAOPENWORLDGAME_API ADhakaStreetLifeGenerator : public AActor
{
    GENERATED_BODY()
public:
    ADhakaStreetLifeGenerator();
    virtual void OnConstruction(const FTransform& Transform) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Street Life", meta=(ClampMin="1",ClampMax="250"))
    int32 VendorCount = 36;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Street Life", meta=(ClampMin="1",ClampMax="1000"))
    int32 StreetPropCount = 180;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Street Life", meta=(ClampMin="1",ClampMax="500"))
    int32 TreeCount = 64;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Street Life", meta=(ClampMin="1000",ClampMax="300000"))
    float AreaExtent = 90000.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Street Life")
    int32 RandomSeed = 2026;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Street Life")
    bool bGenerateTeaAndFoodStalls = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Street Life")
    bool bGenerateStreetFurniture = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Street Life")
    bool bGenerateTreesAndPoles = true;

private:
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<USceneComponent> SceneRoot;
    UPROPERTY(Transient)
    TArray<TObjectPtr<UStaticMeshComponent>> GeneratedParts;
    UPROPERTY(Transient)
    TObjectPtr<UStaticMesh> CubeMesh;
    UPROPERTY(Transient)
    TObjectPtr<UStaticMesh> CylinderMesh;
    UPROPERTY(Transient)
    TObjectPtr<UStaticMesh> SphereMesh;

    UStaticMeshComponent* AddPart(const TCHAR* Name, UStaticMesh* Mesh, FVector Location,
        FVector Scale, FLinearColor Color, FRotator Rotation=FRotator::ZeroRotator);
    void BuildVendor(FVector Location, int32 Kind, FRandomStream& Random);
    void BuildTree(FVector Location, FRandomStream& Random);
    void BuildStreetProp(FVector Location, int32 Kind, FRandomStream& Random);
    void ClearGenerated();
};

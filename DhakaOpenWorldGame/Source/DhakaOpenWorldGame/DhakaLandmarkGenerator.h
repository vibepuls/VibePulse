#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaLandmarkGenerator.generated.h"

class USceneComponent;
class UStaticMesh;
class UStaticMeshComponent;

/** Procedural silhouette landmarks that give generated districts recognisable Dhaka identities. */
UCLASS(BlueprintType)
class DHAKAOPENWORLDGAME_API ADhakaLandmarkGenerator : public AActor
{
    GENERATED_BODY()
public:
    ADhakaLandmarkGenerator();
    virtual void OnConstruction(const FTransform& Transform) override;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Landmarks") int32 RandomSeed=2026;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Landmarks") bool bGenerateOldDhaka=true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Landmarks") bool bGenerateModernDistricts=true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka|Landmarks") bool bGenerateRiverfront=true;
private:
    UPROPERTY(VisibleAnywhere) TObjectPtr<USceneComponent> SceneRoot;
    UPROPERTY(Transient) TArray<TObjectPtr<UStaticMeshComponent>> Parts;
    UPROPERTY(Transient) TObjectPtr<UStaticMesh> Cube;
    UPROPERTY(Transient) TObjectPtr<UStaticMesh> Cylinder;
    UPROPERTY(Transient) TObjectPtr<UStaticMesh> Sphere;
    void ClearParts();
    void Box(const TCHAR* Name,FVector P,FVector S,FLinearColor Color,FRotator R=FRotator::ZeroRotator);
    void Tower(FVector P,float W,float D,float H,FLinearColor Color,int32 Floors);
    void Wall(FVector P,FVector S,FLinearColor Color);
    void BuildOldDhaka();
    void BuildModernDhaka(FRandomStream& R);
    void BuildRiverfront();
};

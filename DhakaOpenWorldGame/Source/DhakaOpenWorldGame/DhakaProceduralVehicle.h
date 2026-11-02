#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaProceduralVehicle.generated.h"

UENUM(BlueprintType)
enum class EDhakaVehicleKind : uint8
{
    Sedan, Hatchback, SUV, Luxury, Microbus, CityBus, Minibus, SchoolBus,
    Coach, Truck, Pickup, CoveredVan, DeliveryVan, Ambulance, Police,
    FireTruck, Motorcycle, Scooter, Bicycle, CycleRickshaw, BatteryRickshaw,
    CNG, HandCart, PassengerBoat, RiverLaunch
};

/** Runtime-generated, configurable Dhaka vehicle. Geometry is split into reusable panels/parts. */
UCLASS(BlueprintType)
class DHAKAOPENWORLDGAME_API ADhakaProceduralVehicle : public AActor
{
    GENERATED_BODY()
public:
    ADhakaProceduralVehicle();
    virtual void OnConstruction(const FTransform& Transform) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle|Generator")
    EDhakaVehicleKind VehicleKind = EDhakaVehicleKind::Sedan;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle|Generator", meta=(ClampMin="1.0"))
    float Length = 440.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle|Generator", meta=(ClampMin="1.0"))
    float Width = 185.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle|Generator", meta=(ClampMin="1.0"))
    float BodyHeight = 105.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle|Generator", meta=(ClampMin="1.0"))
    float CabinHeight = 70.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle|Generator")
    FLinearColor Paint = FLinearColor(0.72f, 0.08f, 0.07f, 1.f);
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle|Generator")
    FLinearColor GlassTint = FLinearColor(0.10f, 0.28f, 0.34f, 1.f);
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle|Generator")
    bool bGenerateInterior = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vehicle|Generator")
    bool bGenerateExteriorTrim = true;

    UFUNCTION(BlueprintCallable, Category="Vehicle|Generator")
    void RegenerateVehicle();

private:
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<USceneComponent> SceneRoot;
    UPROPERTY(VisibleAnywhere)
    TObjectPtr<UProceduralMeshComponent> BodyMesh;
    UPROPERTY(Transient)
    TArray<TObjectPtr<UActorComponent>> GeneratedParts;
    UPROPERTY(Transient)
    TObjectPtr<UMaterialInstanceDynamic> PaintMaterial;
    UPROPERTY(Transient)
    TObjectPtr<UMaterialInstanceDynamic> GlassMaterial;
    UPROPERTY(Transient)
    TObjectPtr<UMaterialInstanceDynamic> DarkMaterial;

    void BuildBodyShell();
    void BuildGlazing();
    void BuildWheelsAndTrim();
    void BuildInterior();
    UStaticMeshComponent* AddPrimitivePart(const TCHAR* Name, UStaticMesh* Mesh,
        const FVector& Location, const FVector& Scale, const FRotator& Rotation,
        UMaterialInterface* Material);
    void AddBoxSection(UProceduralMeshComponent* Target, const FVector& Center,
        const FVector& Size, const FLinearColor& Color, bool bCollision);
};

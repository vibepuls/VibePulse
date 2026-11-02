#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaVendorStall.generated.h"

UENUM(BlueprintType)
enum class EDhakaVendorType : uint8 { Tea, Fuchka, Jhalmuri, Fruit, GeneralShop, Chotpoti, Vegetables, Clothing };

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaVendorStall : public AActor
{
    GENERATED_BODY()
public:
    ADhakaVendorStall();
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vendor") EDhakaVendorType VendorType = EDhakaVendorType::Tea;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Vendor") FText StallName;
    UFUNCTION(BlueprintCallable, Category="Vendor") bool Interact(AActor* Customer);
    UFUNCTION(BlueprintPure, Category="Vendor") FName GetStockItemId() const;
private:
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UBoxComponent> StallCollision;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> Counter;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> Canopy;
    UPROPERTY(VisibleAnywhere) TArray<TObjectPtr<class UStaticMeshComponent>> StallParts;
};
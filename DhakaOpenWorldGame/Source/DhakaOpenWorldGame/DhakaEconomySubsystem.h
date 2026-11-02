#pragma once
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "DhakaEconomySubsystem.generated.h"

USTRUCT(BlueprintType)
struct FDhakaShopItem
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FName Id=NAME_None;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FText Name;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FText Description;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 Price=0;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 SellPrice=0;
};

USTRUCT(BlueprintType)
struct FDhakaPropertyOffer
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FName Id=NAME_None;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FText Name;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FText District;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int64 Price=0;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) int64 DailyIncome=0;
};

UCLASS()
class DHAKAOPENWORLDGAME_API UDhakaEconomySubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintReadOnly) TArray<FDhakaShopItem> ShopCatalog;
    UPROPERTY(BlueprintReadOnly) TArray<FDhakaPropertyOffer> PropertyCatalog;
    UPROPERTY(BlueprintReadOnly) TMap<FName,int32> Inventory;
    UPROPERTY(BlueprintReadOnly) TArray<FName> OwnedProperties;
    UPROPERTY(BlueprintReadOnly) int32 PlayerLevel=1;
    UPROPERTY(BlueprintReadOnly) int64 Experience=0;

    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    UFUNCTION(BlueprintCallable) bool PurchaseItem(FName ItemId,int32 Quantity=1);
    UFUNCTION(BlueprintCallable) bool SellItem(FName ItemId,int32 Quantity=1);
    UFUNCTION(BlueprintCallable) bool UseItem(FName ItemId,int32 Quantity=1);
    UFUNCTION(BlueprintCallable) bool PurchaseProperty(FName PropertyId);
    UFUNCTION(BlueprintPure) bool OwnsProperty(FName PropertyId) const;
    UFUNCTION(BlueprintCallable) void AwardExperience(int64 Amount);
    UFUNCTION(BlueprintCallable) bool SaveEconomy();
    UFUNCTION(BlueprintCallable) bool LoadEconomy();
private:
    void BuildCatalog();
    void CreditOwnedPropertyIncome();
};

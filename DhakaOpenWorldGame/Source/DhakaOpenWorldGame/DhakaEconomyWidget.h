#pragma once
#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "DhakaEconomyWidget.generated.h"

class UTextBlock;
class UButton;
class UComboBoxString;

UCLASS()
class DHAKAOPENWORLDGAME_API UDhakaEconomyWidget : public UUserWidget
{
    GENERATED_BODY()
protected:
    virtual void NativeConstruct() override;
    virtual void NativeTick(const FGeometry& MyGeometry,float InDeltaTime) override;
private:
    UPROPERTY() TObjectPtr<UTextBlock> WalletLabel;
    UPROPERTY() TObjectPtr<UTextBlock> StatusLabel;
    UPROPERTY() TObjectPtr<UTextBlock> InventoryLabel;
    UPROPERTY() TObjectPtr<UComboBoxString> MissionPicker;
    float RefreshTimer=0.f;
    void AddLabel(class UVerticalBox* Box,const FString& Text,bool bHeading=false);
    void AddActionButton(class UVerticalBox* Box,const FString& Text,UButton*& OutButton);
    void RefreshStatus();
    UFUNCTION() void BuyWater();
    UFUNCTION() void BuyFirstAid();
    UFUNCTION() void BuyFuel();
    UFUNCTION() void BuyRepair();
    UFUNCTION() void SellWater();
    UFUNCTION() void SellSnack();
    UFUNCTION() void SellTea();
    UFUNCTION() void SellFuchka();
    UFUNCTION() void SellJhalmuri();
    UFUNCTION() void SellFruit();
    UFUNCTION() void BuyOldDhakaShop();
    UFUNCTION() void BuyDhanmondiFlat();
    UFUNCTION() void BuyUttaraGarage();
    UFUNCTION() void BuyGulshanOffice();
    UFUNCTION() void ClaimRent();
    UFUNCTION() void UseSelectedFirstAid();
    UFUNCTION() void UseFood();
    UFUNCTION() void UseFuel();
    UFUNCTION() void UseRepair();
    UFUNCTION() void OnMissionSelected(FString SelectedItem,ESelectInfo::Type SelectionType);
    UFUNCTION() void NextVehicleType();
    UFUNCTION() void PaintVehicleRed();
    UFUNCTION() void PaintVehicleBlue();
    UFUNCTION() void PaintVehicleGreen();
    class ADhakaVehiclePawn* FindVehicleForCustomization() const;
};
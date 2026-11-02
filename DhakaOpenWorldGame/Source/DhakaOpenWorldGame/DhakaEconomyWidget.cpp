#include "DhakaEconomyWidget.h"
#include "DhakaEconomySubsystem.h"
#include "DhakaMissionSubsystem.h"
#include "DhakaPlayerCharacter.h"
#include "DhakaVehiclePawn.h"
#include "Blueprint/WidgetTree.h"
#include "Components/Border.h"
#include "Components/Button.h"
#include "Components/ComboBoxString.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/ScrollBox.h"
#include "Components/SizeBox.h"
#include "Components/TextBlock.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"
#include "Engine/GameInstance.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

void UDhakaEconomyWidget::NativeConstruct()
{
    Super::NativeConstruct();
    if(!WidgetTree)return;
    UCanvasPanel* Root=WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass(),TEXT("EconomyRoot"));
    WidgetTree->RootWidget=Root;
    USizeBox* Size=WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass(),TEXT("EconomyPanelSize"));
    Size->SetWidthOverride(330.f);Size->SetHeightOverride(600.f);
    UBorder* Border=WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass(),TEXT("EconomyPanelBorder"));
    Border->SetPadding(FMargin(12.f));Border->SetBrushColor(FLinearColor(.018f,.028f,.042f,.94f));
    UVerticalBox* Layout=WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass(),TEXT("EconomyLayout"));
    Border->SetContent(Layout);Size->SetContent(Border);
    UCanvasPanelSlot* PanelSlot=Root->AddChildToCanvas(Size);
    PanelSlot->SetAnchors(FAnchors(1.f,0.f,1.f,0.f));PanelSlot->SetAlignment(FVector2D(1.f,0.f));PanelSlot->SetPosition(FVector2D(-18.f,18.f));PanelSlot->SetAutoSize(false);PanelSlot->SetSize(FVector2D(330.f,600.f));
    AddLabel(Layout,TEXT("DHAKA CITY SERVICES"),true);
    WalletLabel=WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass(),TEXT("WalletLabel"));
    WalletLabel->SetColorAndOpacity(FSlateColor(FLinearColor(.3f,1.f,.82f,1.f)));Layout->AddChildToVerticalBox(WalletLabel);
    MissionPicker=WidgetTree->ConstructWidget<UComboBoxString>(UComboBoxString::StaticClass(),TEXT("MissionPicker"));
    if(UGameInstance* GI=GetGameInstance())if(UDhakaMissionSubsystem* Missions=GI->GetSubsystem<UDhakaMissionSubsystem>())
    {
        for(const FDhakaMission& Mission:Missions->Missions)MissionPicker->AddOption(Mission.Title.ToString());
        if(Missions->Missions.IsValidIndex(Missions->ActiveMissionIndex))MissionPicker->SetSelectedOption(Missions->Missions[Missions->ActiveMissionIndex].Title.ToString());
    }
    MissionPicker->OnSelectionChanged.AddDynamic(this,&UDhakaEconomyWidget::OnMissionSelected);
    Layout->AddChildToVerticalBox(MissionPicker);
    StatusLabel=WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass(),TEXT("TransactionStatus"));
    StatusLabel->SetAutoWrapText(true);StatusLabel->SetColorAndOpacity(FSlateColor(FLinearColor(.95f,.83f,.48f,1.f)));Layout->AddChildToVerticalBox(StatusLabel);
    InventoryLabel=WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass(),TEXT("InventoryLabel"));
    InventoryLabel->SetAutoWrapText(true);InventoryLabel->SetColorAndOpacity(FSlateColor(FLinearColor(.82f,.87f,.9f,1.f)));Layout->AddChildToVerticalBox(InventoryLabel);
    UScrollBox* Scroll=WidgetTree->ConstructWidget<UScrollBox>(UScrollBox::StaticClass(),TEXT("EconomyActionsScroll"));
    if(UVerticalBoxSlot* ScrollSlot=Layout->AddChildToVerticalBox(Scroll))ScrollSlot->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
    UVerticalBox* Actions=WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass(),TEXT("EconomyActions"));
    Scroll->AddChild(Actions);
    UButton* Button=nullptr;
    AddActionButton(Actions,TEXT("Buy Water Bottle  |  ৳30"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::BuyWater);
    AddActionButton(Actions,TEXT("Buy First Aid Kit  |  ৳250"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::BuyFirstAid);
    AddActionButton(Actions,TEXT("Buy Fuel Can  |  ৳450"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::BuyFuel);
    AddActionButton(Actions,TEXT("Buy Repair Kit  |  ৳800"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::BuyRepair);
    AddActionButton(Actions,TEXT("Buy Old Dhaka Shop  |  ৳85,000"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::BuyOldDhakaShop);
    AddActionButton(Actions,TEXT("Buy Dhanmondi Flat  |  ৳420,000"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::BuyDhanmondiFlat);
    AddActionButton(Actions,TEXT("Buy Uttara Garage  |  ৳650,000"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::BuyUttaraGarage);
    AddActionButton(Actions,TEXT("Buy Gulshan Office  |  ৳1,500,000"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::BuyGulshanOffice);
    AddActionButton(Actions,TEXT("Claim Daily Property Rent  |  P"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::ClaimRent);
    AddLabel(Actions,TEXT("GARAGE / VEHICLE CUSTOMIZATION"),true);
    AddActionButton(Actions,TEXT("Next Vehicle Type  |  N"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::NextVehicleType);
    AddActionButton(Actions,TEXT("Paint Vehicle Red"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::PaintVehicleRed);
    AddActionButton(Actions,TEXT("Paint Vehicle Blue"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::PaintVehicleBlue);
    AddActionButton(Actions,TEXT("Paint Vehicle Green"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::PaintVehicleGreen);
    AddActionButton(Actions,TEXT("Use First Aid  |  F1"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::UseSelectedFirstAid);
    AddActionButton(Actions,TEXT("Use Food/Drink  |  F2"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::UseFood);
    AddActionButton(Actions,TEXT("Use Fuel Can  |  F3"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::UseFuel);
    AddActionButton(Actions,TEXT("Use Repair Kit  |  F4"),Button);Button->OnClicked.AddDynamic(this,&UDhakaEconomyWidget::UseRepair);
    RefreshStatus();
}
void UDhakaEconomyWidget::AddLabel(UVerticalBox* Box,const FString& Text,bool bHeading)
{
    if(!Box||!WidgetTree)return;
    UTextBlock* Label=WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
    Label->SetText(FText::FromString(Text));Label->SetAutoWrapText(true);
    Label->SetColorAndOpacity(FSlateColor(bHeading?FLinearColor(.22f,.95f,.78f,1.f):FLinearColor::White));
    Box->AddChildToVerticalBox(Label);
}
void UDhakaEconomyWidget::AddActionButton(UVerticalBox* Box,const FString& Text,UButton*& OutButton)
{
    OutButton=WidgetTree->ConstructWidget<UButton>(UButton::StaticClass());
    UTextBlock* Label=WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
    Label->SetText(FText::FromString(Text));Label->SetAutoWrapText(true);
    OutButton->SetContent(Label);OutButton->SetIsEnabled(true);
    if(UVerticalBoxSlot* Slot=Box->AddChildToVerticalBox(OutButton)){Slot->SetPadding(FMargin(0.f,3.f));Slot->SetSize(FSlateChildSize(ESlateSizeRule::Automatic));}
}
void UDhakaEconomyWidget::NativeTick(const FGeometry& MyGeometry,float InDeltaTime)
{
    Super::NativeTick(MyGeometry,InDeltaTime);
    RefreshTimer-=InDeltaTime;
    if(RefreshTimer<=0.f){RefreshTimer=.25f;RefreshStatus();}
}
void UDhakaEconomyWidget::RefreshStatus()
{
    UGameInstance* GI=GetGameInstance();if(!GI)return;
    UDhakaEconomySubsystem* Economy=GI->GetSubsystem<UDhakaEconomySubsystem>();
    UDhakaMissionSubsystem* Missions=GI->GetSubsystem<UDhakaMissionSubsystem>();
    if(WalletLabel&&Missions)WalletLabel->SetText(FText::FromString(FString::Printf(TEXT("WALLET  ৳ %lld"),static_cast<long long>(Missions->Wallet))));
    if(StatusLabel&&Economy&&!Economy->LastTransactionMessage.IsEmpty())StatusLabel->SetText(Economy->LastTransactionMessage);
    if(InventoryLabel&&Economy)InventoryLabel->SetText(FText::FromString(FString::Printf(TEXT("BAG Water:%d First aid:%d Snack:%d Fuel:%d Repair:%d"),Economy->Inventory.FindRef(TEXT("water_bottle")),Economy->Inventory.FindRef(TEXT("first_aid")),Economy->Inventory.FindRef(TEXT("street_snack")),Economy->Inventory.FindRef(TEXT("fuel_can")),Economy->Inventory.FindRef(TEXT("repair_kit")))));
    if(InventoryLabel&&Economy)InventoryLabel->SetText(FText::FromString(FString::Printf(TEXT("BAG  Water:%d  First aid:%d  Snack:%d  Fuel:%d  Repair:%d"),Economy->Inventory.FindRef(TEXT("water_bottle")),Economy->Inventory.FindRef(TEXT("first_aid")),Economy->Inventory.FindRef(TEXT("street_snack")),Economy->Inventory.FindRef(TEXT("fuel_can")),Economy->Inventory.FindRef(TEXT("repair_kit")))));
}
void UDhakaEconomyWidget::BuyWater(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->PurchaseItem(TEXT("water_bottle"));}
void UDhakaEconomyWidget::BuyFirstAid(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->PurchaseItem(TEXT("first_aid"));}
void UDhakaEconomyWidget::BuyFuel(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->PurchaseItem(TEXT("fuel_can"));}
void UDhakaEconomyWidget::BuyRepair(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->PurchaseItem(TEXT("repair_kit"));}
void UDhakaEconomyWidget::BuyOldDhakaShop(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->PurchaseProperty(TEXT("old_dhaka_shop"));}
void UDhakaEconomyWidget::BuyDhanmondiFlat(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->PurchaseProperty(TEXT("dhanmondi_flat"));}
void UDhakaEconomyWidget::BuyUttaraGarage(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->PurchaseProperty(TEXT("uttara_garage"));}
void UDhakaEconomyWidget::BuyGulshanOffice(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->PurchaseProperty(TEXT("gulshan_office"));}
void UDhakaEconomyWidget::ClaimRent(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->ClaimPropertyIncome();}
void UDhakaEconomyWidget::UseSelectedFirstAid()
{
    if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())
        if(APawn* Pawn=UGameplayStatics::GetPlayerPawn(this,0))E->UseItem(TEXT("first_aid"),Pawn);
}

void UDhakaEconomyWidget::UseFood(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())if(APawn* Pawn=UGameplayStatics::GetPlayerPawn(this,0))E->UseItem(TEXT("street_snack"),Pawn);}
void UDhakaEconomyWidget::UseFuel(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())if(APawn* Pawn=UGameplayStatics::GetPlayerPawn(this,0))E->UseItem(TEXT("fuel_can"),Pawn);}
void UDhakaEconomyWidget::UseRepair(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())if(APawn* Pawn=UGameplayStatics::GetPlayerPawn(this,0))E->UseItem(TEXT("repair_kit"),Pawn);}

void UDhakaEconomyWidget::OnMissionSelected(FString SelectedItem,ESelectInfo::Type SelectionType)
{
    if(UGameInstance* GI=GetGameInstance())if(UDhakaMissionSubsystem* Missions=GI->GetSubsystem<UDhakaMissionSubsystem>())
    {
        for(const FDhakaMission& Mission:Missions->Missions)
            if(Mission.Title.ToString()==SelectedItem){Missions->StartMission(Mission.Id);break;}
    }
}

ADhakaVehiclePawn* UDhakaEconomyWidget::FindVehicleForCustomization() const
{
    if(ADhakaVehiclePawn* Current=Cast<ADhakaVehiclePawn>(UGameplayStatics::GetPlayerPawn(this,0)))return Current;
    APawn* Pawn=UGameplayStatics::GetPlayerPawn(this,0);
    if(!Pawn||!GetWorld())return nullptr;
    ADhakaVehiclePawn* BestVehicle=nullptr;float BestDistance=550.f;
    for(TActorIterator<ADhakaVehiclePawn> It(GetWorld());It;++It)
    {
        if(It->bOccupied)continue;
        const float Distance=FVector::Dist2D(Pawn->GetActorLocation(),It->GetActorLocation());
        if(Distance<BestDistance){BestDistance=Distance;BestVehicle=*It;}
    }
    return BestVehicle;
}
void UDhakaEconomyWidget::NextVehicleType()
{
    if(ADhakaVehiclePawn* Vehicle=FindVehicleForCustomization())
    {
        const int32 Next=(static_cast<int32>(Vehicle->VehicleType)+1)%5;
        Vehicle->ConfigureVehicleType(static_cast<EDhakaPlayerVehicleType>(Next));
    }
    else if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())
        E->LastTransactionMessage=FText::FromString(TEXT("Go near an unoccupied vehicle to customize it."));
}
void UDhakaEconomyWidget::PaintVehicleRed(){if(ADhakaVehiclePawn* V=FindVehicleForCustomization())V->SetPaintColor(FLinearColor(.8f,.06f,.045f,1.f));}
void UDhakaEconomyWidget::PaintVehicleBlue(){if(ADhakaVehiclePawn* V=FindVehicleForCustomization())V->SetPaintColor(FLinearColor(.04f,.22f,.85f,1.f));}
void UDhakaEconomyWidget::PaintVehicleGreen(){if(ADhakaVehiclePawn* V=FindVehicleForCustomization())V->SetPaintColor(FLinearColor(.04f,.58f,.2f,1.f));}

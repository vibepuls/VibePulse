#include "DhakaOpenWorldHUD.h"
#include "DhakaEconomyWidget.h"
#include "GameFramework/PlayerController.h"
#include "DhakaMissionSubsystem.h"
#include "DhakaEconomySubsystem.h"
#include "DhakaPlayerCharacter.h"
#include "DhakaVehiclePawn.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"

void ADhakaOpenWorldHUD::BeginPlay()
{
    Super::BeginPlay();
    if(APlayerController* PC=UGameplayStatics::GetPlayerController(this,0))
    {
        EconomyWidget=CreateWidget<UDhakaEconomyWidget>(PC,UDhakaEconomyWidget::StaticClass());
        if(EconomyWidget)EconomyWidget->AddToViewport(20);
        PC->bShowMouseCursor=true;
        PC->SetInputMode(FInputModeGameAndUI());
    }
}
void ADhakaOpenWorldHUD::DrawHUD()
{
    Super::DrawHUD();
    if (!Canvas || !GetWorld()) return;
    UFont* Font=GEngine?GEngine->GetMediumFont():nullptr;
    if (!Font) return;

    UDhakaMissionSubsystem* Missions=nullptr;
    if (UGameInstance* GI=GetWorld()->GetGameInstance())
        Missions=GI->GetSubsystem<UDhakaMissionSubsystem>();
    UDhakaEconomySubsystem* Economy=nullptr;
    if (UGameInstance* GI=GetWorld()->GetGameInstance())
        Economy=GI->GetSubsystem<UDhakaEconomySubsystem>();

    const float PanelX=24.f, PanelY=24.f, PanelW=540.f, PanelH=332.f;
    Canvas->DrawRect(FLinearColor(0.025f,0.035f,0.055f,0.88f),PanelX,PanelY,PanelW,PanelH);
    Canvas->SetDrawColor(FColor(30,210,190,255));
    Canvas->DrawRect(FLinearColor(0.08f,0.82f,0.72f,1.f),PanelX,PanelY,4.f,PanelH);

    Canvas->SetDrawColor(FColor::White);
    Canvas->DrawText(Font,TEXT("DHAKA OPEN WORLD  |  F6 WEATHER  F7 TIME  F8 GRAPHICS"),PanelX+18.f,PanelY+12.f,1.0f,1.0f);
    if (!Missions)
    {
        Canvas->DrawText(Font,TEXT("Progress system unavailable"),PanelX+18.f,PanelY+52.f,0.85f,0.85f);
        return;
    }

    const FString WalletText=FString::Printf(TEXT("Wallet: ৳ %lld"),static_cast<long long>(Missions->Wallet));
    Canvas->DrawText(Font,WalletText,PanelX+18.f,PanelY+43.f,0.9f,0.9f);

    if (Missions->Missions.IsValidIndex(Missions->ActiveMissionIndex))
    {
        const FDhakaMission& Mission=Missions->Missions[Missions->ActiveMissionIndex];
        Canvas->DrawText(Font,FString::Printf(TEXT("MISSION: %s"),*Mission.Title.ToString()),PanelX+18.f,PanelY+72.f,0.85f,0.85f);
        Canvas->DrawText(Font,Mission.Description.ToString(),PanelX+18.f,PanelY+98.f,0.68f,0.68f);
        if (Mission.TimeLimitSeconds>0.f)
        {
            const int32 Seconds=FMath::CeilToInt(Missions->ActiveMissionTimeRemaining);
            Canvas->DrawText(Font,FString::Printf(TEXT("TIME LEFT  %02d:%02d"),Seconds/60,Seconds%60),PanelX+18.f,PanelY+123.f,0.78f,0.78f);
        }
        if (APawn* Player=UGameplayStatics::GetPlayerPawn(this,0))
        {
            const float DistanceMeters=FVector::Dist2D(Player->GetActorLocation(),Mission.Target)/100.f;
            Canvas->DrawText(Font,FString::Printf(TEXT("DESTINATION  %.0f m"),DistanceMeters),PanelX+18.f,PanelY+147.f,0.78f,0.78f);
        }
    }
    else if (!Missions->LastMissionResult.IsEmpty())
    {
        Canvas->DrawText(Font,Missions->LastMissionResult,PanelX+18.f,PanelY+82.f,0.8f,0.8f);
    }
    else
    {
        Canvas->DrawText(Font,TEXT("No active mission"),PanelX+18.f,PanelY+82.f,0.8f,0.8f);
    }
    if(Economy)
    {
        Canvas->DrawText(Font,FString::Printf(TEXT("LEVEL %d  |  XP %lld"),Economy->PlayerLevel,static_cast<long long>(Economy->Experience)),PanelX+18.f,PanelY+171.f,0.78f,0.78f);
        if(!Economy->LastTransactionMessage.IsEmpty())Canvas->DrawText(Font,Economy->LastTransactionMessage.ToString(),PanelX+18.f,PanelY+198.f,0.68f,0.68f);
    }
    if(APawn* Pawn=UGameplayStatics::GetPlayerPawn(this,0))
    {
        if(ADhakaVehiclePawn* Vehicle=Cast<ADhakaVehiclePawn>(Pawn))
            Canvas->DrawText(Font,FString::Printf(TEXT("FUEL %.0f%%  |  VEHICLE CONDITION %.0f%%"),Vehicle->FuelPercent,Vehicle->ConditionPercent),PanelX+18.f,PanelY+224.f,.68f,.68f);
        else if(ADhakaPlayerCharacter* Character=Cast<ADhakaPlayerCharacter>(Pawn))
            Canvas->DrawText(Font,FString::Printf(TEXT("HEALTH %.0f%%  |  STAMINA %.0f%%"),Character->Health,Character->Stamina),PanelX+18.f,PanelY+224.f,.68f,.68f);
    }
    if(Economy)
    {
        const FString InventoryText=FString::Printf(TEXT("BAG  First aid:%d  Snack:%d  Fuel:%d  Repair:%d"),
            Economy->Inventory.FindRef(TEXT("first_aid")),Economy->Inventory.FindRef(TEXT("street_snack")),
            Economy->Inventory.FindRef(TEXT("fuel_can")),Economy->Inventory.FindRef(TEXT("repair_kit")));
        Canvas->DrawText(Font,InventoryText,PanelX+18.f,PanelY+253.f,.56f,.56f);
    }
    Canvas->DrawText(Font,TEXT("E: Interact | F: Property | P: Rent | F1: First Aid | F2: Food | F3: Fuel | F4: Repair"),PanelX+18.f,PanelY+278.f,0.56f,0.56f);
    Canvas->DrawText(Font,TEXT("Mobile: drag left side to move/steer; drag right side to look"),PanelX+18.f,PanelY+302.f,0.56f,0.56f);
    if(Missions && Canvas->ClipX>900.f)
    {
        const float ListW=310.f, ListX=Canvas->ClipX-ListW-24.f, ListY=24.f;
        const int32 VisibleCount=FMath::Min(10,Missions->Missions.Num());
        Canvas->DrawRect(FLinearColor(.02f,.03f,.045f,.86f),ListX,ListY,ListW,34.f+VisibleCount*22.f);
        Canvas->SetDrawColor(FColor(30,210,190,255));
        Canvas->DrawRect(FLinearColor(.08f,.82f,.72f,1.f),ListX,ListY,3.f,34.f+VisibleCount*22.f);
        Canvas->SetDrawColor(FColor::White);
        Canvas->DrawText(Font,TEXT("MISSIONS  |  press 1-9 or 0"),ListX+12.f,ListY+7.f,.68f,.68f);
        for(int32 I=0;I<VisibleCount;++I)
        {
            const FDhakaMission& Item=Missions->Missions[I];
            const FString Status=I==Missions->ActiveMissionIndex?TEXT("  [ACTIVE]"):(Item.bCompleted?TEXT("  [DONE]"):(Item.bFailed?TEXT("  [FAILED]"):TEXT("")));
            const FString SlotLabel=I==9?TEXT("0"):FString::FromInt(I+1);
            Canvas->DrawText(Font,SlotLabel+TEXT(". ")+Item.Title.ToString()+Status,ListX+12.f,ListY+34.f+I*22.f,.56f,.56f);
        }
    }
}

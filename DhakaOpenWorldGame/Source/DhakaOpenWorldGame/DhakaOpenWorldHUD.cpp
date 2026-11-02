#include "DhakaOpenWorldHUD.h"
#include "DhakaMissionSubsystem.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"

void ADhakaOpenWorldHUD::DrawHUD()
{
    Super::DrawHUD();
    if (!Canvas || !GetWorld()) return;
    UFont* Font=GEngine?GEngine->GetMediumFont():nullptr;
    if (!Font) return;

    UDhakaMissionSubsystem* Missions=nullptr;
    if (UGameInstance* GI=GetWorld()->GetGameInstance())
        Missions=GI->GetSubsystem<UDhakaMissionSubsystem>();

    const float PanelX=24.f, PanelY=24.f, PanelW=430.f, PanelH=150.f;
    Canvas->DrawRect(FLinearColor(0.025f,0.035f,0.055f,0.88f),PanelX,PanelY,PanelW,PanelH);
    Canvas->SetDrawColor(FColor(30,210,190,255));
    Canvas->DrawRect(FLinearColor(0.08f,0.82f,0.72f,1.f),PanelX,PanelY,4.f,PanelH);

    Canvas->SetDrawColor(FColor::White);
    Canvas->DrawText(Font,TEXT("DHAKA OPEN WORLD"),PanelX+18.f,PanelY+12.f,1.0f,1.0f);
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
    }
    else if (!Missions->LastMissionResult.IsEmpty())
    {
        Canvas->DrawText(Font,Missions->LastMissionResult,PanelX+18.f,PanelY+82.f,0.8f,0.8f);
    }
    else
    {
        Canvas->DrawText(Font,TEXT("No active mission"),PanelX+18.f,PanelY+82.f,0.8f,0.8f);
    }
}

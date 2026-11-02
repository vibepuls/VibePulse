#include "DhakaMissionSubsystem.h"
#include "DhakaProgressSaveGame.h"
#include "DhakaEconomySubsystem.h"
#include "Engine/World.h"
#include "Engine/TimerManager.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"

namespace
{
    const TCHAR* DhakaProgressSlot = TEXT("DhakaOpenWorldProgress");
    constexpr int32 DhakaProgressUserIndex = 0;
}

void UDhakaMissionSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    auto Add = [this](FName Id, const TCHAR* Title, const TCHAR* Desc, int32 Reward, FVector Target,
                      EDhakaMissionType Type, float Radius, float TimeLimit = 0.f)
    {
        FDhakaMission M;
        M.Id=Id; M.Title=FText::FromString(Title); M.Description=FText::FromString(Desc);
        M.Reward=Reward; M.Target=Target; M.Type=Type; M.TargetRadius=Radius; M.TimeLimitSeconds=TimeLimit;
        Missions.Add(M);
    };
    Add("explore_lalbagh", TEXT("Old Dhaka Explorer"), TEXT("Reach Lalbagh Fort and explore the historic district."), 500, FVector(-88000,103000,0), EDhakaMissionType::Exploration, 900.f);
    Add("taxi_gulshan", TEXT("CNG Taxi Run"), TEXT("Drive to Gulshan Circle before time runs out."), 850, FVector(-53333,-53333,0), EDhakaMissionType::Taxi, 700.f, 180.f);
    Add("market_delivery", TEXT("Market Delivery"), TEXT("Deliver a package to Old Dhaka market."), 700, FVector(-85000,100000,0), EDhakaMissionType::Delivery, 650.f, 150.f);
    Add("bus_route", TEXT("City Bus Route"), TEXT("Reach the marked city bus stop."), 1000, FVector(100000,70000,0), EDhakaMissionType::BusRoute, 800.f, 240.f);
    Add("street_sprint", TEXT("Dhaka Street Sprint"), TEXT("Reach the finish point before the timer expires."), 1200, FVector(150000,-10000,0), EDhakaMissionType::Race, 650.f, 90.f);
    Add("sadarghat", TEXT("Riverfront Visit"), TEXT("Visit Sadarghat and the Buriganga riverfront."), 600, FVector(130000,145000,0), EDhakaMissionType::Exploration, 1000.f);
    Add("rickshaw_neighborhood", TEXT("Rickshaw Neighborhood Run"), TEXT("Reach the neighborhood destination."), 650, FVector(-25000,45000,0), EDhakaMissionType::Rickshaw, 550.f, 180.f);
    Add("weekly_city_tour", TEXT("Weekly City Tour"), TEXT("Explore the city and reach the marked destination."), 1800, FVector(60000,-90000,0), EDhakaMissionType::WeeklyChallenge, 900.f, 420.f);
    Add("daily_commute", TEXT("Daily Commute"), TEXT("Reach the destination for today's commute."), 400, FVector(25000,25000,0), EDhakaMissionType::DailyChallenge, 500.f, 120.f);
    Add("property_scout", TEXT("Property Scout"), TEXT("Visit the marked location to scout a property."), 900, FVector(75000,45000,0), EDhakaMissionType::Property, 700.f);
    if (!LoadProgress()) StartMission("explore_lalbagh");
}

void UDhakaMissionSubsystem::Deinitialize()
{
    SaveProgress();
    if (UWorld* World=GetWorld()) World->GetTimerManager().ClearTimer(MissionUpdateTimer);
    Super::Deinitialize();
}

bool UDhakaMissionSubsystem::StartMission(FName MissionId)
{
    for (int32 I=0; I<Missions.Num(); ++I)
    {
        if (Missions[I].Id==MissionId && !Missions[I].bCompleted && !Missions[I].bFailed)
        {
            ActiveMissionIndex=I;
            ActiveMissionTimeRemaining=Missions[I].TimeLimitSeconds;
            LastMissionResult.Reset();
            StartMissionMonitor();
            SaveProgress();
            return true;
        }
    }
    return false;
}

bool UDhakaMissionSubsystem::StartMissionBySlot(int32 Slot)
{
    if(Slot==10)Slot=0;
    const int32 Index=Slot==0?9:Slot-1;
    if(!Missions.IsValidIndex(Index)||Missions[Index].bCompleted)return false;
    if(Missions[Index].bFailed)Missions[Index].bFailed=false;
    return StartMission(Missions[Index].Id);
}

void UDhakaMissionSubsystem::StartMissionMonitor()
{
    if (UWorld* World=GetWorld())
    {
        World->GetTimerManager().ClearTimer(MissionUpdateTimer);
        World->GetTimerManager().SetTimer(MissionUpdateTimer, this, &UDhakaMissionSubsystem::UpdateActiveMission, 0.25f, true);
    }
}

void UDhakaMissionSubsystem::EnsureMissionMonitor()
{
    if (!Missions.IsValidIndex(ActiveMissionIndex)) return;
    UWorld* World=GetWorld();
    if (World && !World->GetTimerManager().IsTimerActive(MissionUpdateTimer))
        StartMissionMonitor();
}

void UDhakaMissionSubsystem::UpdateActiveMission()
{
    if (!Missions.IsValidIndex(ActiveMissionIndex)) return;
    FDhakaMission& Mission=Missions[ActiveMissionIndex];
    if (Mission.bCompleted || Mission.bFailed) return;
    if (Mission.TimeLimitSeconds>0.f)
    {
        ActiveMissionTimeRemaining=FMath::Max(0.f,ActiveMissionTimeRemaining-0.25f);
        MissionAutosaveTimer+=0.25f;
        if(MissionAutosaveTimer>=10.f){MissionAutosaveTimer=0.f;SaveProgress();}
        if (ActiveMissionTimeRemaining<=0.f) { FailActiveMission(); return; }
    }
    APawn* Player=UGameplayStatics::GetPlayerPawn(this,0);
    if (!Player) return;
    FVector PlayerLocation=Player->GetActorLocation();
    FVector TargetLocation=Mission.Target;
    PlayerLocation.Z=0.f; TargetLocation.Z=0.f;
    if (FVector::DistSquared2D(PlayerLocation,TargetLocation)<=FMath::Square(Mission.TargetRadius))
        CompleteActiveMission();
}

bool UDhakaMissionSubsystem::CompleteActiveMission()
{
    if (!Missions.IsValidIndex(ActiveMissionIndex) || Missions[ActiveMissionIndex].bCompleted || Missions[ActiveMissionIndex].bFailed) return false;
    const int32 CompletedIndex=ActiveMissionIndex;
    Missions[CompletedIndex].bCompleted=true;
    const int64 Reward=FMath::Max(0,Missions[CompletedIndex].Reward);
    Wallet=Wallet>MAX_int64-Reward?MAX_int64:Wallet+Reward;
    if(UGameInstance* GI=GetGameInstance())
        if(UDhakaEconomySubsystem* Economy=GI->GetSubsystem<UDhakaEconomySubsystem>()) Economy->AwardExperience(static_cast<int64>(Reward)/2+50);
    LastMissionResult=FString::Printf(TEXT("Completed: %s (+%d)"),*Missions[CompletedIndex].Title.ToString(),Missions[CompletedIndex].Reward);
    if (UWorld* World=GetWorld()) World->GetTimerManager().ClearTimer(MissionUpdateTimer);
    ActiveMissionIndex=INDEX_NONE;
    ActiveMissionTimeRemaining=0.f;
    for (int32 Offset=1; Offset<=Missions.Num(); ++Offset)
    {
        const int32 Candidate=(CompletedIndex+Offset)%Missions.Num();
        if (!Missions[Candidate].bCompleted && !Missions[Candidate].bFailed)
        {
            ActiveMissionIndex=Candidate;
            ActiveMissionTimeRemaining=Missions[Candidate].TimeLimitSeconds;
            StartMissionMonitor();
            break;
        }
    }
    SaveProgress();
    return true;
}

void UDhakaMissionSubsystem::FailActiveMission()
{
    if (!Missions.IsValidIndex(ActiveMissionIndex)) return;
    const int32 FailedIndex=ActiveMissionIndex;
    if (Missions[FailedIndex].bCompleted || Missions[FailedIndex].bFailed) return;
    Missions[FailedIndex].bFailed=true;
    LastMissionResult=FString::Printf(TEXT("Failed: %s"),*Missions[FailedIndex].Title.ToString());
    if (UWorld* World=GetWorld()) World->GetTimerManager().ClearTimer(MissionUpdateTimer);
    ActiveMissionIndex=INDEX_NONE;
    ActiveMissionTimeRemaining=0.f;
    SaveProgress();
}

void UDhakaMissionSubsystem::AddWallet(int64 Amount)
{
    if (Amount<0) Wallet=(Amount < -Wallet)?0:Wallet+Amount;
    else Wallet=(Wallet>MAX_int64-Amount)?MAX_int64:Wallet+Amount;
    SaveProgress();
}

bool UDhakaMissionSubsystem::SaveProgress()
{
    UDhakaProgressSaveGame* Save=Cast<UDhakaProgressSaveGame>(UGameplayStatics::CreateSaveGameObject(UDhakaProgressSaveGame::StaticClass()));
    if (!Save) return false;
    Save->Wallet=Wallet;
    Save->Missions=Missions;
    Save->ActiveMissionId=Missions.IsValidIndex(ActiveMissionIndex)?Missions[ActiveMissionIndex].Id:NAME_None;
    Save->ActiveMissionTimeRemaining=ActiveMissionTimeRemaining;
    Save->Version=2;
    return UGameplayStatics::SaveGameToSlot(Save,DhakaProgressSlot,DhakaProgressUserIndex);
}

bool UDhakaMissionSubsystem::LoadProgress()
{
    if (!UGameplayStatics::DoesSaveGameExist(DhakaProgressSlot,DhakaProgressUserIndex)) return false;
    UDhakaProgressSaveGame* Save=Cast<UDhakaProgressSaveGame>(UGameplayStatics::LoadGameFromSlot(DhakaProgressSlot,DhakaProgressUserIndex));
    if (!Save || (Save->Version<1 || Save->Version>2)) return false;
    Wallet=FMath::Max<int64>(0,Save->Wallet);
    for (FDhakaMission& Mission:Missions)
    {
        const FDhakaMission* Saved=Save->Missions.FindByPredicate([&Mission](const FDhakaMission& Candidate){return Candidate.Id==Mission.Id;});
        if (Saved) { Mission.bCompleted=Saved->bCompleted; Mission.bFailed=Saved->bFailed; }
    }
    ActiveMissionIndex=INDEX_NONE;
    for (int32 I=0;I<Missions.Num();++I)
        if (Missions[I].Id==Save->ActiveMissionId && !Missions[I].bCompleted && !Missions[I].bFailed) {ActiveMissionIndex=I;break;}
    if (ActiveMissionIndex==INDEX_NONE)
    {
        for (int32 I=0;I<Missions.Num();++I) if(!Missions[I].bCompleted&&!Missions[I].bFailed){ActiveMissionIndex=I;break;}
    }
    if (Missions.IsValidIndex(ActiveMissionIndex))
    {
        ActiveMissionTimeRemaining=Save->Version>=2?FMath::Clamp(Save->ActiveMissionTimeRemaining,0.f,Missions[ActiveMissionIndex].TimeLimitSeconds>0.f?Missions[ActiveMissionIndex].TimeLimitSeconds:Save->ActiveMissionTimeRemaining):Missions[ActiveMissionIndex].TimeLimitSeconds;
        if(Missions[ActiveMissionIndex].TimeLimitSeconds>0.f&&ActiveMissionTimeRemaining<=0.f)ActiveMissionTimeRemaining=Missions[ActiveMissionIndex].TimeLimitSeconds;
        StartMissionMonitor();
    }
    return true;
}

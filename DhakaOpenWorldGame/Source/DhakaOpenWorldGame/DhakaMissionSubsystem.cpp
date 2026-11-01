#include "DhakaMissionSubsystem.h"

void UDhakaMissionSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    auto Add = [this](FName Id, const TCHAR* Title, const TCHAR* Desc, int32 Reward, FVector Target) {
        FDhakaMission M; M.Id=Id; M.Title=FText::FromString(Title); M.Description=FText::FromString(Desc); M.Reward=Reward; M.Target=Target; Missions.Add(M);
    };
    Add("explore_lalbagh", TEXT("Old Dhaka Explorer"), TEXT("Reach Lalbagh Fort and explore the historic district."), 500, FVector(-88000,103000,0));
    Add("taxi_gulshan", TEXT("CNG Taxi Run"), TEXT("Drive a passenger to Gulshan Circle."), 850, FVector(-52000,-52000,0));
    Add("market_delivery", TEXT("Market Delivery"), TEXT("Deliver a package to Old Dhaka market."), 700, FVector(-85000,100000,0));
    Add("bus_route", TEXT("City Bus Route"), TEXT("Complete the marked city bus stop route."), 1000, FVector(100000,70000,0));
    Add("street_sprint", TEXT("Dhaka Street Sprint"), TEXT("Reach the finish point before the timer expires."), 1200, FVector(150000,-10000,0));
    Add("sadarghat", TEXT("Riverfront Visit"), TEXT("Visit Sadarghat and the Buriganga riverfront."), 600, FVector(40000,145000,0));
    StartMission("explore_lalbagh");
}
bool UDhakaMissionSubsystem::StartMission(FName MissionId)
{
    for (int32 I=0; I<Missions.Num(); ++I) if (Missions[I].Id==MissionId && !Missions[I].bCompleted) { ActiveMissionIndex=I; return true; }
    return false;
}
bool UDhakaMissionSubsystem::CompleteActiveMission()
{
    if (!Missions.IsValidIndex(ActiveMissionIndex) || Missions[ActiveMissionIndex].bCompleted) return false;
    const int32 CompletedIndex=ActiveMissionIndex; Missions[CompletedIndex].bCompleted=true; Wallet += FMath::Max(0,Missions[CompletedIndex].Reward); ActiveMissionIndex=INDEX_NONE;
    for(int32 Offset=1;Offset<=Missions.Num();++Offset){const int32 Candidate=(CompletedIndex+Offset)%Missions.Num();if(!Missions[Candidate].bCompleted){ActiveMissionIndex=Candidate;break;}}
    return true;
}
void UDhakaMissionSubsystem::AddWallet(int64 Amount) { Wallet=FMath::Max<int64>(0,Wallet+Amount); }

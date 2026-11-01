#include "DhakaGameMode.h"
#include "DhakaCityGenerator.h"
#include "DhakaVehiclePawn.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"

ADhakaGameMode::ADhakaGameMode()
{
    DefaultPawnClass=nullptr;
    CityGeneratorClass=ADhakaCityGenerator::StaticClass();
    VehiclePawnClass=ADhakaVehiclePawn::StaticClass();
}
void ADhakaGameMode::BeginPlay()
{
    Super::BeginPlay();
    if(!GetWorld()) return;
    if(CityGeneratorClass) GetWorld()->SpawnActor<ADhakaCityGenerator>(CityGeneratorClass,FVector::ZeroVector,FRotator::ZeroRotator);
    if(VehiclePawnClass){
        const FVector SpawnLocation(-520.f,-520.f,180.f);
        ADhakaVehiclePawn* Vehicle=GetWorld()->SpawnActor<ADhakaVehiclePawn>(VehiclePawnClass,SpawnLocation,FRotator::ZeroRotator);
        if(Vehicle){ if(APlayerController* PC=GetWorld()->GetFirstPlayerController()) PC->Possess(Vehicle); }
    }
}

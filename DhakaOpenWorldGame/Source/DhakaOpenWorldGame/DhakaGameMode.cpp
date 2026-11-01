#include "DhakaGameMode.h"
#include "DhakaCityGenerator.h"
#include "DhakaVehiclePawn.h"
#include "DhakaTrafficVehicle.h"
#include "DhakaPedestrian.h"
#include "DhakaWeatherController.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Engine/SkyAtmosphere.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/SkyLightComponent.h"

ADhakaGameMode::ADhakaGameMode()
{
    DefaultPawnClass=nullptr;
    CityGeneratorClass=ADhakaCityGenerator::StaticClass();
    VehiclePawnClass=ADhakaVehiclePawn::StaticClass();
}
void ADhakaGameMode::BeginPlay()
{
    Super::BeginPlay();
    UWorld* World=GetWorld(); if(!World)return;
    if(CityGeneratorClass) World->SpawnActor<ADhakaCityGenerator>(CityGeneratorClass,FVector::ZeroVector,FRotator::ZeroRotator);
    ADirectionalLight* Sun=World->SpawnActor<ADirectionalLight>(ADirectionalLight::StaticClass(),FVector::ZeroVector,FRotator(-42.f,-32.f,0.f));if(Sun){Sun->GetLightComponent()->SetIntensity(4.0f);Sun->GetLightComponent()->SetCastShadows(true);}
    ASkyLight* Sky=World->SpawnActor<ASkyLight>(ASkyLight::StaticClass(),FVector::ZeroVector,FRotator::ZeroRotator);if(Sky){Sky->GetLightComponent()->SetIntensity(1.1f);Sky->GetLightComponent()->RecaptureSky();}
    World->SpawnActor<ASkyAtmosphere>(ASkyAtmosphere::StaticClass(),FVector::ZeroVector,FRotator::ZeroRotator);
    World->SpawnActor<ADhakaWeatherController>(ADhakaWeatherController::StaticClass(),FVector::ZeroVector,FRotator::ZeroRotator);
    if(VehiclePawnClass){
        const FVector SpawnLocation(-53333.f,-53333.f,125.f);
        ADhakaVehiclePawn* Vehicle=World->SpawnActor<ADhakaVehiclePawn>(VehiclePawnClass,SpawnLocation,FRotator::ZeroRotator);
        if(Vehicle){ if(APlayerController* PC=World->GetFirstPlayerController()) PC->Possess(Vehicle); }
    }
    // Bounded ambient traffic pool; directions follow the procedural street grid.
    for(int32 I=0;I<42;++I){
        const bool bHorizontal=(I%2)==0;
        const float Road=-160000.f+FMath::RoundToFloat(FMath::FRandRange(0.f,18.f))*17777.f;
        const float Along=FMath::FRandRange(-145000.f,145000.f);
        const FVector Location=bHorizontal?FVector(Along,Road,65.f):FVector(Road,Along,65.f);
        const FVector Direction=bHorizontal?FVector(I%4<2?1.f:-1.f,0,0):FVector(0,I%4<2?1.f:-1.f,0);
        ADhakaTrafficVehicle* Traffic=World->SpawnActor<ADhakaTrafficVehicle>(ADhakaTrafficVehicle::StaticClass(),Location,Direction.Rotation());
        if(Traffic){Traffic->RouteDirection=Direction;Traffic->CruiseSpeed=FMath::FRandRange(350.f,1050.f);Traffic->BrakeDistance=FMath::FRandRange(450.f,900.f);}
    }
    // Low-poly crowd agents use randomized footpath destinations and pause states.
    for(int32 I=0;I<64;++I){
        const float X=FMath::FRandRange(-150000.f,150000.f),Y=FMath::FRandRange(-150000.f,150000.f);
        ADhakaPedestrian* Ped=World->SpawnActor<ADhakaPedestrian>(ADhakaPedestrian::StaticClass(),FVector(X,Y,92.f),FRotator::ZeroRotator);
        if(Ped){Ped->Destination=Ped->GetActorLocation()+FVector(FMath::FRandRange(-900.f,900.f),FMath::FRandRange(-900.f,900.f),0.f);Ped->WalkSpeed=FMath::FRandRange(110.f,175.f);}
    }
}

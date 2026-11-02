#include "DhakaGameMode.h"
#include "DhakaOpenWorldHUD.h"
#include "DhakaMissionSubsystem.h"
#include "DhakaMissionMarker.h"
#include "DhakaCityGenerator.h"
#include "DhakaVehiclePawn.h"
#include "DhakaTrafficVehicle.h"
#include "DhakaPedestrian.h"
#include "DhakaWeatherController.h"
#include "DhakaStreetLifeGenerator.h"
#include "DhakaProceduralCitizen.h"
#include "DhakaLandmarkGenerator.h"
#include "DhakaTrafficSignal.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Engine/SkyAtmosphere.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Kismet/GameplayStatics.h"

ADhakaGameMode::ADhakaGameMode()
{
    DefaultPawnClass=nullptr;
    HUDClass=ADhakaOpenWorldHUD::StaticClass();
    CityGeneratorClass=ADhakaCityGenerator::StaticClass();
    VehiclePawnClass=ADhakaVehiclePawn::StaticClass();
}
void ADhakaGameMode::BeginPlay()
{
    Super::BeginPlay();
    UWorld* World=GetWorld(); if(!World)return;
    if (UGameInstance* GI=World->GetGameInstance())
        if (UDhakaMissionSubsystem* Missions=GI->GetSubsystem<UDhakaMissionSubsystem>()) Missions->EnsureMissionMonitor();
    World->SpawnActor<ADhakaMissionMarker>(ADhakaMissionMarker::StaticClass(),FVector::ZeroVector,FRotator::ZeroRotator);
    if(CityGeneratorClass) World->SpawnActor<ADhakaCityGenerator>(CityGeneratorClass,FVector::ZeroVector,FRotator::ZeroRotator);
    if(ADhakaLandmarkGenerator* Landmarks=World->SpawnActorDeferred<ADhakaLandmarkGenerator>(ADhakaLandmarkGenerator::StaticClass(),FTransform::Identity))
    { Landmarks->RandomSeed=2026; UGameplayStatics::FinishSpawningActor(Landmarks,FTransform::Identity); }
    // Additional street-life dressing is generated procedurally at runtime, with a fixed seed for repeatable layouts.
    if(ADhakaStreetLifeGenerator* StreetLife=World->SpawnActorDeferred<ADhakaStreetLifeGenerator>(ADhakaStreetLifeGenerator::StaticClass(),FTransform::Identity))
    {
        StreetLife->RandomSeed=2026; StreetLife->VendorCount=14; StreetLife->StreetPropCount=72; StreetLife->TreeCount=24; StreetLife->AreaExtent=72000.f;
        UGameplayStatics::FinishSpawningActor(StreetLife,FTransform::Identity);
    }
    ADirectionalLight* Sun=World->SpawnActor<ADirectionalLight>(ADirectionalLight::StaticClass(),FVector::ZeroVector,FRotator(-42.f,-32.f,0.f));if(Sun){Sun->GetLightComponent()->SetIntensity(4.0f);Sun->GetLightComponent()->SetCastShadows(true);}
    ASkyLight* Sky=World->SpawnActor<ASkyLight>(ASkyLight::StaticClass(),FVector::ZeroVector,FRotator::ZeroRotator);if(Sky){Sky->GetLightComponent()->SetIntensity(1.1f);Sky->GetLightComponent()->RecaptureSky();}
    World->SpawnActor<ASkyAtmosphere>(ASkyAtmosphere::StaticClass(),FVector::ZeroVector,FRotator::ZeroRotator);
    World->SpawnActor<ADhakaWeatherController>(ADhakaWeatherController::StaticClass(),FVector::ZeroVector,FRotator::ZeroRotator);
    if(VehiclePawnClass){
        const FVector SpawnLocation(-53333.f,-53333.f,125.f);
        ADhakaVehiclePawn* Vehicle=World->SpawnActor<ADhakaVehiclePawn>(VehiclePawnClass,SpawnLocation,FRotator::ZeroRotator);
        if(Vehicle){ if(APlayerController* PC=World->GetFirstPlayerController()) PC->Possess(Vehicle); }
    }
    // Install timed signals at the central grid intersections; the axis determines right-of-way.
    for(int32 IX=-1;IX<=1;++IX)for(int32 IY=-1;IY<=1;++IY){
        const FTransform SignalTransform(FRotator::ZeroRotator,FVector(IX*53333.f,IY*53333.f,0.f));
        if(ADhakaTrafficSignal* Signal=World->SpawnActorDeferred<ADhakaTrafficSignal>(ADhakaTrafficSignal::StaticClass(),SignalTransform)){
            Signal->MainRoadDirection=FVector(1,0,0);UGameplayStatics::FinishSpawningActor(Signal,SignalTransform);
        }
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
    // Procedural citizens provide clothing and body variation near active streets.
    for(int32 I=0;I<18;++I){
        const float X=FMath::FRandRange(-45000.f,45000.f),Y=FMath::FRandRange(-45000.f,45000.f);
        const FTransform CitizenTransform(FRotator(0.f,FMath::FRandRange(0.f,360.f),0.f),FVector(X,Y,5.f));
        ADhakaProceduralCitizen* Citizen=World->SpawnActorDeferred<ADhakaProceduralCitizen>(ADhakaProceduralCitizen::StaticClass(),CitizenTransform);
        if(Citizen){
            Citizen->AppearanceSeed=2026+I*37; Citizen->Appearance.Clothing=static_cast<EDhakaClothingStyle>(I%9);
            Citizen->bWanderLocally=(I%3)!=0; Citizen->WalkSpeed=FMath::FRandRange(65.f,115.f); Citizen->WanderRadius=FMath::FRandRange(500.f,1400.f);
            Citizen->Appearance.TopColor=FLinearColor(FMath::FRandRange(.05f,.8f),FMath::FRandRange(.05f,.8f),FMath::FRandRange(.05f,.8f),1.f);
            UGameplayStatics::FinishSpawningActor(Citizen,CitizenTransform);
        }
    }
    // Low-poly crowd agents use randomized footpath destinations and pause states.
    for(int32 I=0;I<64;++I){
        const float X=FMath::FRandRange(-150000.f,150000.f),Y=FMath::FRandRange(-150000.f,150000.f);
        ADhakaPedestrian* Ped=World->SpawnActor<ADhakaPedestrian>(ADhakaPedestrian::StaticClass(),FVector(X,Y,101.f),FRotator::ZeroRotator);
        if(Ped){Ped->Destination=Ped->GetActorLocation()+FVector(FMath::FRandRange(-900.f,900.f),FMath::FRandRange(-900.f,900.f),0.f);Ped->WalkSpeed=FMath::FRandRange(110.f,175.f);}
    }
}

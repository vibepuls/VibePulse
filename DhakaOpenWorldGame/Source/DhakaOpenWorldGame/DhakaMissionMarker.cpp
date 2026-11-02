#include "DhakaMissionMarker.h"
#include "DhakaMissionSubsystem.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

ADhakaMissionMarker::ADhakaMissionMarker()
{
    PrimaryActorTick.bCanEverTick=true;
    SceneRoot=CreateDefaultSubobject<USceneComponent>(TEXT("MissionMarkerRoot"));
    SetRootComponent(SceneRoot);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    Beacon=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("MissionBeacon"));
    Beacon->SetupAttachment(SceneRoot);
    if(Cylinder.Succeeded())Beacon->SetStaticMesh(Cylinder.Object);
    Beacon->SetRelativeLocation(FVector(0,0,420.f));
    Beacon->SetRelativeScale3D(FVector(.22f,.22f,8.4f));
    Beacon->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    BeaconTop=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("MissionBeaconTop"));
    BeaconTop->SetupAttachment(SceneRoot);
    if(Sphere.Succeeded())BeaconTop->SetStaticMesh(Sphere.Object);
    BeaconTop->SetRelativeLocation(FVector(0,0,850.f));
    BeaconTop->SetRelativeScale3D(FVector(1.8f,1.8f,1.8f));
    BeaconTop->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    if(UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial")))
    {
        UMaterialInstanceDynamic* Material=UMaterialInstanceDynamic::Create(Base,this);
        if(Material)
        {
            Material->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.02f,1.f,.72f,1.f));
            Material->SetScalarParameterValue(TEXT("EmissiveStrength"),4.f);
            Beacon->SetMaterial(0,Material);
            BeaconTop->SetMaterial(0,Material);
        }
    }
}
void ADhakaMissionMarker::Tick(float Dt)
{
    Super::Tick(Dt);
    RefreshTimer-=Dt;
    if(RefreshTimer>0.f)return;
    RefreshTimer=.2f;
    UGameInstance* GI=GetWorld()?GetWorld()->GetGameInstance():nullptr;
    UDhakaMissionSubsystem* Missions=GI?GI->GetSubsystem<UDhakaMissionSubsystem>():nullptr;
    if(!Missions||!Missions->Missions.IsValidIndex(Missions->ActiveMissionIndex))
    {
        SetActorHiddenInGame(true);
        LastMissionIndex=INDEX_NONE;
        return;
    }
    const FDhakaMission& Mission=Missions->Missions[Missions->ActiveMissionIndex];
    if(LastMissionIndex!=Missions->ActiveMissionIndex||!GetActorLocation().Equals(Mission.Target+FVector(0,0,0),50.f))
    {
        SetActorLocation(FVector(Mission.Target.X,Mission.Target.Y,0.f));
        LastMissionIndex=Missions->ActiveMissionIndex;
    }
    SetActorHiddenInGame(false);
    const float Pulse=1.f+FMath::Sin(GetWorld()->GetTimeSeconds()*3.f)*.08f;
    BeaconTop->SetRelativeScale3D(FVector(1.8f,1.8f,1.8f)*Pulse);
}

#include "DhakaWetRoadEffect.h"
#include "DhakaWeatherController.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

ADhakaWetRoadEffect::ADhakaWetRoadEffect()
{
    PrimaryActorTick.bCanEverTick=true;
    SetActorTickInterval(0.5f);
    Puddles=CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("PuddleInstances"));
    SetRootComponent(Puddles);
    Puddles->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Puddles->SetVisibility(false,true);
    Puddles->SetCastShadow(false);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if(Sphere.Succeeded())Puddles->SetStaticMesh(Sphere.Object);
}
void ADhakaWetRoadEffect::BeginPlay()
{
    Super::BeginPlay();
    FRandomStream Random(RandomSeed);
    for(int32 I=0;I<FMath::Clamp(PuddleCount,0,500);++I)
    {
        const bool bOnHorizontalRoad=Random.FRand()<0.5f;
        const float RoadLine=-160000.f+Random.RandRange(0,18)*(320000.f/18.f);
        const float Along=Random.FRandRange(-AreaExtent,AreaExtent);
        const float Offset=Random.FRandRange(-1400.f,1400.f);
        const FVector Location=bOnHorizontalRoad?FVector(Along,RoadLine+Offset,7.f):FVector(RoadLine+Offset,Along,7.f);
        const FRotator Rotation(0.f,Random.FRandRange(0.f,180.f),0.f);
        const FVector Scale(Random.FRandRange(.8f,2.4f),Random.FRandRange(.45f,1.35f),.012f);
        Puddles->AddInstance(FTransform(Rotation,Location,Scale));
    }
    if(UMaterialInterface* Base=Puddles->GetMaterial(0))
    {
        if(UMaterialInstanceDynamic* Wet=UMaterialInstanceDynamic::Create(Base,this))
        {
            Wet->SetVectorParameterValue(TEXT("Color"),FLinearColor(.035f,.065f,.075f,1.f));
            Wet->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.035f,.065f,.075f,1.f));
            Puddles->SetMaterial(0,Wet);
        }
    }
    UpdateWeatherVisibility();
}
void ADhakaWetRoadEffect::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    RefreshTimer-=DeltaSeconds;
    if(RefreshTimer<=0.f){RefreshTimer=.75f;UpdateWeatherVisibility();}
}
void ADhakaWetRoadEffect::UpdateWeatherVisibility()
{
    bool bWet=false;
    if(GetWorld())
    {
        for(TActorIterator<ADhakaWeatherController> It(GetWorld());It;++It)
        {
            if(It->RainIntensity>.08f){bWet=true;break;}
        }
    }
    if(Puddles&&bWet!=bPuddlesVisible){Puddles->SetVisibility(bWet,true);bPuddlesVisible=bWet;}
}
#include "DhakaRainEffect.h"
#include "Components/SceneComponent.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"
#include "UObject/ConstructorHelpers.h"

ADhakaRainEffect::ADhakaRainEffect()
{
    PrimaryActorTick.bCanEverTick=true;
    SceneRoot=CreateDefaultSubobject<USceneComponent>(TEXT("RainRoot"));
    SetRootComponent(SceneRoot);
    Drops=CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("RainDrops"));
    Drops->SetupAttachment(SceneRoot);
    Drops->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Drops->SetCastShadow(false);
    Drops->SetReceivesDecals(false);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if(Cube.Succeeded()) Drops->SetStaticMesh(Cube.Object);
    Drops->SetNumCustomDataFloats(1);
    RebuildRain();
}
void ADhakaRainEffect::RebuildRain()
{
    if(!Drops)return;
    Drops->ClearInstances();
    LocalDropPositions.Reset();DropSpeeds.Reset();
    const int32 Count=FMath::Clamp(MaximumDrops,100,5000);
    LocalDropPositions.Reserve(Count);DropSpeeds.Reserve(Count);
    FRandomStream Random(87231);
    for(int32 I=0;I<Count;++I)
    {
        const FVector Position(Random.FRandRange(-Radius,Radius),Random.FRandRange(-Radius,Radius),Random.FRandRange(0.f,Height));
        LocalDropPositions.Add(Position);
        DropSpeeds.Add(Random.FRandRange(900.f,1800.f));
        const FTransform T(FRotator(0,0,Random.FRandRange(-7.f,7.f)),Position,FVector(.025f,.025f,Random.FRandRange(.35f,.8f)));
        Drops->AddInstance(T);
        Drops->SetCustomDataValue(I,0,Random.FRandRange(.35f,1.f),false);
    }
    Drops->MarkRenderStateDirty();
}
void ADhakaRainEffect::SetRainIntensity(float NewIntensity)
{
    Intensity=FMath::Clamp(NewIntensity,0.f,1.f);
    SetActorTickEnabled(Intensity>.001f);
    if(Drops)Drops->SetVisibility(Intensity>.001f,true);
}
void ADhakaRainEffect::Tick(float Dt)
{
    Super::Tick(Dt);
    if(Intensity<=.001f||!Drops||Dt<=0.f)return;
    APawn* Player=UGameplayStatics::GetPlayerPawn(this,0);
    if(Player)
    {
        const FVector Target=Player->GetActorLocation()+FVector(0,0,Height*.25f);
        SetActorLocation(FMath::VInterpTo(GetActorLocation(),Target,Dt,5.f));
    }
    const int32 Count=FMath::Min(LocalDropPositions.Num(),Drops->GetInstanceCount());
    for(int32 I=0;I<Count;++I)
    {
        FVector P=LocalDropPositions[I];
        P.Z-=DropSpeeds[I]*Intensity*Dt;
        if(P.Z<0.f)
        {
            P.Z=Height;
            P.X=FMath::FRandRange(-Radius,Radius);
            P.Y=FMath::FRandRange(-Radius,Radius);
        }
        LocalDropPositions[I]=P;
        FTransform T;
        if(Drops->GetInstanceTransform(I,T,false))
        {
            T.SetLocation(P);
            Drops->UpdateInstanceTransform(I,T,false,false,true);
        }
    }
}

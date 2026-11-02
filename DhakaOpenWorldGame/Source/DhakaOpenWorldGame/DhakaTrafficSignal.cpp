#include "DhakaTrafficSignal.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"
#include "Engine/StaticMesh.h"

ADhakaTrafficSignal::ADhakaTrafficSignal()
{
    PrimaryActorTick.bCanEverTick=true;
    SceneRoot=CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot"));SetRootComponent(SceneRoot);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    auto Make=[this](const TCHAR* Name,UStaticMesh* Mesh,FVector Pos,FVector Scale)
    {
        UStaticMeshComponent* C=CreateDefaultSubobject<UStaticMeshComponent>(Name);C->SetupAttachment(SceneRoot);C->SetStaticMesh(Mesh);C->SetRelativeLocation(Pos);C->SetRelativeScale3D(Scale);C->SetCollisionEnabled(ECollisionEnabled::NoCollision);return C;
    };
    Pole=Make(TEXT("SignalPole"),Cylinder.Succeeded()?Cylinder.Object:nullptr,FVector(0,0,230),FVector(7,7,230));
    Head=Make(TEXT("SignalHead"),Cube.Succeeded()?Cube.Object:nullptr,FVector(0,0,470),FVector(28,20,58));
    RedLamp=Make(TEXT("RedLamp"),Sphere.Succeeded()?Sphere.Object:nullptr,FVector(28,-22,500),FVector(10,10,10));
    YellowLamp=Make(TEXT("YellowLamp"),Sphere.Succeeded()?Sphere.Object:nullptr,FVector(28,-22,470),FVector(10,10,10));
    GreenLamp=Make(TEXT("GreenLamp"),Sphere.Succeeded()?Sphere.Object:nullptr,FVector(28,-22,440),FVector(10,10,10));
    ApplyLampMaterials();
}
void ADhakaTrafficSignal::Tick(float Dt)
{
    Super::Tick(Dt);PhaseElapsed+=Dt;
    if(Phase==EDhakaSignalPhase::MainGreen&&PhaseElapsed>=MainGreenSeconds){Phase=EDhakaSignalPhase::MainYellow;PhaseElapsed=0;ApplyLampMaterials();}
    else if(Phase==EDhakaSignalPhase::MainYellow&&PhaseElapsed>=YellowSeconds){Phase=EDhakaSignalPhase::CrossGreen;PhaseElapsed=0;ApplyLampMaterials();}
    else if(Phase==EDhakaSignalPhase::CrossGreen&&PhaseElapsed>=CrossGreenSeconds){Phase=EDhakaSignalPhase::MainGreen;PhaseElapsed=0;ApplyLampMaterials();}
}
bool ADhakaTrafficSignal::IsRedForDirection(FVector TravelDirection) const
{
    const float Alignment=FMath::Abs(FVector::DotProduct(TravelDirection.GetSafeNormal2D(),MainRoadDirection.GetSafeNormal2D()));
    const bool bMainAxis=Alignment>=.72f;
    if(bMainAxis)return Phase!=EDhakaSignalPhase::MainGreen;
    return Phase==EDhakaSignalPhase::MainGreen||Phase==EDhakaSignalPhase::MainYellow;
}
void ADhakaTrafficSignal::ApplyLampMaterials()
{
    auto Set=[this](UStaticMeshComponent* C,FLinearColor Color,bool bOn)
    {
        if(!C)return;
        if(UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial")))
        {
            UMaterialInstanceDynamic* M=UMaterialInstanceDynamic::Create(Base,this);
            if(M){M->SetVectorParameterValue(TEXT("BaseColor"),bOn?Color:Color*.12f);M->SetScalarParameterValue(TEXT("EmissiveStrength"),bOn?4.f:.0f);C->SetMaterial(0,M);}
        }
    };
    Set(RedLamp,FLinearColor(1.f,.015f,.01f),Phase==EDhakaSignalPhase::CrossGreen);
    Set(YellowLamp,FLinearColor(1.f,.55f,.015f),Phase==EDhakaSignalPhase::MainYellow);
    Set(GreenLamp,FLinearColor(.02f,.9f,.08f),Phase==EDhakaSignalPhase::MainGreen);
}

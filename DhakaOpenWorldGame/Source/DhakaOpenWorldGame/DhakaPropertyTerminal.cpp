#include "DhakaPropertyTerminal.h"
#include "Components/BoxComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/GameInstance.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"
#include "DhakaEconomySubsystem.h"

ADhakaPropertyTerminal::ADhakaPropertyTerminal()
{
    PrimaryActorTick.bCanEverTick=false;
    InteractionVolume=CreateDefaultSubobject<UBoxComponent>(TEXT("PropertyInteraction"));
    SetRootComponent(InteractionVolume);
    InteractionVolume->SetBoxExtent(FVector(100.f,80.f,100.f));
    InteractionVolume->SetCollisionProfileName(TEXT("BlockAll"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    SignPost=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("PropertySignPost"));
    SignPost->SetupAttachment(InteractionVolume);
    if(Cube.Succeeded())SignPost->SetStaticMesh(Cube.Object);
    SignPost->SetRelativeScale3D(FVector(.12f,.12f,1.25f));
    SignPost->SetRelativeLocation(FVector(0,0,70.f));
    SignPost->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    SignBoard=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("PropertySignBoard"));
    SignBoard->SetupAttachment(InteractionVolume);
    if(Cube.Succeeded())SignBoard->SetStaticMesh(Cube.Object);
    SignBoard->SetRelativeScale3D(FVector(.9f,.12f,.42f));
    SignBoard->SetRelativeLocation(FVector(0,0,145.f));
    SignBoard->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    if(Base)
    {
        if(UMaterialInstanceDynamic* Mat=UMaterialInstanceDynamic::Create(Base,this))
        {
            Mat->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.06f,.36f,.32f));
            Mat->SetVectorParameterValue(TEXT("Color"),FLinearColor(.06f,.36f,.32f));
            SignBoard->SetMaterial(0,Mat);
        }
    }
}
bool ADhakaPropertyTerminal::Interact(AActor* Customer)
{
    if(!Customer||FVector::Dist2D(Customer->GetActorLocation(),GetActorLocation())>450.f||!GetGameInstance()||PropertyId.IsNone())return false;
    if(UDhakaEconomySubsystem* Economy=GetGameInstance()->GetSubsystem<UDhakaEconomySubsystem>())
        return Economy->PurchaseProperty(PropertyId);
    return false;
}
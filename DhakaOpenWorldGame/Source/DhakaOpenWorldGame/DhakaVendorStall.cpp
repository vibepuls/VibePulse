#include "DhakaVendorStall.h"
#include "Components/BoxComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/World.h"
#include "Engine/GameInstance.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"
#include "DhakaEconomySubsystem.h"
#include "DhakaAudioDirector.h"
#include "EngineUtils.h"

ADhakaVendorStall::ADhakaVendorStall()
{
    PrimaryActorTick.bCanEverTick=false;
    StallCollision=CreateDefaultSubobject<UBoxComponent>(TEXT("StallCollision"));
    SetRootComponent(StallCollision);
    StallCollision->SetBoxExtent(FVector(115.f,75.f,85.f));
    StallCollision->SetCollisionProfileName(TEXT("BlockAll"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    auto MakePart=[this,&Cube,Base](const TCHAR* Name,FVector Scale,FVector Location,FLinearColor Color)->UStaticMeshComponent*
    {
        UStaticMeshComponent* Part=CreateDefaultSubobject<UStaticMeshComponent>(Name);
        Part->SetupAttachment(StallCollision);
        if(Cube.Succeeded())Part->SetStaticMesh(Cube.Object);
        Part->SetRelativeScale3D(Scale);
        Part->SetRelativeLocation(Location);
        Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        if(Base)
        {
            if(UMaterialInstanceDynamic* Mat=UMaterialInstanceDynamic::Create(Base,this))
            {
                Mat->SetVectorParameterValue(TEXT("BaseColor"),Color);
                Mat->SetVectorParameterValue(TEXT("Color"),Color);
                Part->SetMaterial(0,Mat);
            }
        }
        StallParts.Add(Part);
        return Part;
    };
    Counter=MakePart(TEXT("VendorCounter"),FVector(1.45f,.95f,.16f),FVector(0,0,55.f),FLinearColor(.34f,.19f,.09f));
    Canopy=MakePart(TEXT("VendorCanopy"),FVector(1.8f,1.15f,.1f),FVector(0,0,150.f),FLinearColor(.05f,.38f,.34f));
    MakePart(TEXT("CanopyPostLeft"),FVector(.07f,.07f,.85f),FVector(0,-62.f,100.f),FLinearColor(.22f,.22f,.2f));
    MakePart(TEXT("CanopyPostRight"),FVector(.07f,.07f,.85f),FVector(0,62.f,100.f),FLinearColor(.22f,.22f,.2f));
    MakePart(TEXT("ShelfGoods1"),FVector(.22f,.18f,.22f),FVector(20.f,-18.f,76.f),FLinearColor(.95f,.55f,.1f));
    MakePart(TEXT("ShelfGoods2"),FVector(.2f,.18f,.18f),FVector(-22.f,18.f,74.f),FLinearColor(.9f,.18f,.12f));
    MakePart(TEXT("ShelfGoods3"),FVector(.18f,.16f,.24f),FVector(30.f,22.f,76.f),FLinearColor(.2f,.58f,.2f));
}
FName ADhakaVendorStall::GetStockItemId() const
{
    switch(VendorType)
    {
        case EDhakaVendorType::Tea: return TEXT("tea_cup");
        case EDhakaVendorType::Fuchka: return TEXT("fuchka_plate");
        case EDhakaVendorType::Jhalmuri: return TEXT("jhalmuri_packet");
        case EDhakaVendorType::Fruit: return TEXT("fruit_bag");
        case EDhakaVendorType::Chotpoti: return TEXT("chotpoti_plate");
        case EDhakaVendorType::Vegetables: return TEXT("vegetable_bag");
        case EDhakaVendorType::Clothing: return TEXT("clothing_bundle");
        default: return TEXT("water_bottle");
    }
}
bool ADhakaVendorStall::Interact(AActor* Customer)
{
    if(!Customer||FVector::Dist2D(Customer->GetActorLocation(),GetActorLocation())>400.f||!GetGameInstance())return false;
    if(UDhakaEconomySubsystem* Economy=GetGameInstance()->GetSubsystem<UDhakaEconomySubsystem>())
    {
        const bool bPurchased=Economy->PurchaseItem(GetStockItemId(),1);
        if(bPurchased)for(TActorIterator<ADhakaAudioDirector> It(GetWorld());It;++It){It->PlayVendorCall();break;}
        return bPurchased;
    }
    return false;
}
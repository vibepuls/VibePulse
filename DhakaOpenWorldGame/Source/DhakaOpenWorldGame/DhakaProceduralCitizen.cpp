#include "DhakaProceduralCitizen.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"
#include "Engine/StaticMesh.h"

ADhakaProceduralCitizen::ADhakaProceduralCitizen()
{
    PrimaryActorTick.bCanEverTick=true;
    SceneRoot=CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot"));SetRootComponent(SceneRoot);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> C(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> S(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Y(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    if(C.Succeeded())Cube=C.Object;if(S.Succeeded())Sphere=S.Object;if(Y.Succeeded())Cylinder=Y.Object;
}
void ADhakaProceduralCitizen::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);ClearParts();FRandomStream R(AppearanceSeed);BuildAppearance(R);
    Home=GetActorLocation();if(WanderTarget.IsNearlyZero())WanderTarget=Home+FVector(R.FRandRange(-WanderRadius,WanderRadius),R.FRandRange(-WanderRadius,WanderRadius),0);
}
void ADhakaProceduralCitizen::ClearParts(){for(UStaticMeshComponent* P:Parts)if(P)P->DestroyComponent();Parts.Reset();}
UStaticMeshComponent* ADhakaProceduralCitizen::Part(const TCHAR* Name,UStaticMesh* Mesh,FVector Location,FVector Scale,FLinearColor Color,FRotator Rotation)
{
    if(!Mesh)return nullptr;UStaticMeshComponent* Cmp=NewObject<UStaticMeshComponent>(this,Name);if(!Cmp)return nullptr;
    Cmp->SetupAttachment(SceneRoot);Cmp->SetStaticMesh(Mesh);Cmp->SetRelativeLocation(Location);Cmp->SetRelativeScale3D(Scale);Cmp->SetRelativeRotation(Rotation);Cmp->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    if(UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"))){UMaterialInstanceDynamic* M=UMaterialInstanceDynamic::Create(Base,this);if(M){M->SetVectorParameterValue(TEXT("BaseColor"),Color);Cmp->SetMaterial(0,M);}}
    AddInstanceComponent(Cmp);Cmp->RegisterComponent();Parts.Add(Cmp);return Cmp;
}
void ADhakaProceduralCitizen::BuildAppearance(FRandomStream& R)
{
    const float H=FMath::Clamp(Appearance.Height,.78f,1.24f), B=FMath::Clamp(Appearance.Build,.72f,1.35f);
    const float Leg=82.f*H, Torso=70.f*H, Head=25.f*H, Shoulder=22.f*B;
    const FLinearColor Skin=Appearance.Skin, Hair=Appearance.HairColor, Top=Appearance.TopColor, Bottom=Appearance.BottomColor;
    const FLinearColor Shoe(.025f,.024f,.022f), Dark(.055f,.05f,.045f);
    // Head, neck, ears, facial features, hair and torso.
    Part(TEXT("Citizen_Torso"),Cube,FVector(0,0,Leg+Torso*.48f),FVector(Shoulder,14.f*B,Torso*.52f),Top);
    Part(TEXT("Citizen_Neck"),Cylinder,FVector(0,0,Leg+Torso+5.f),FVector(6,6,8),Skin);
    Part(TEXT("Citizen_Head"),Sphere,FVector(0,0,Leg+Torso+Head),FVector(15.f*H,13.f*H,Head),Skin);
    Part(TEXT("Citizen_Hair"),Sphere,FVector(-2,0,Leg+Torso+Head*1.63f),FVector(15.f*H,13.5f*H,7.f*H),Hair);
    Part(TEXT("Citizen_Ear_L"),Sphere,FVector(0,-14.f*H,Leg+Torso+Head),FVector(3,3,5),Skin);
    Part(TEXT("Citizen_Ear_R"),Sphere,FVector(0,14.f*H,Leg+Torso+Head),FVector(3,3,5),Skin);
    Part(TEXT("Citizen_Eye_L"),Sphere,FVector(12.f*H,-5.f*H,Leg+Torso+Head+2.f),FVector(2.3f,2.1f,2.3f),Dark);
    Part(TEXT("Citizen_Eye_R"),Sphere,FVector(12.f*H,5.f*H,Leg+Torso+Head+2.f),FVector(2.3f,2.1f,2.3f),Dark);
    Part(TEXT("Citizen_Nose"),Sphere,FVector(15.f*H,0,Leg+Torso+Head-3.f),FVector(3.2f,3.4f,5.f),Skin);
    Part(TEXT("Citizen_Mouth"),Cube,FVector(13.f*H,0,Leg+Torso+Head-9.f),FVector(1.3f,4.f,1.2f),FLinearColor(.22f,.07f,.06f));
    // Arms, hands and legs are separate so animation can articulate them.
    Part(TEXT("Citizen_Arm_L"),Cube,FVector(0,-Shoulder-7.f,Leg+Torso*.68f),FVector(8,6,Torso*.43f),Top);
    Part(TEXT("Citizen_Arm_R"),Cube,FVector(0,Shoulder+7.f,Leg+Torso*.68f),FVector(8,6,Torso*.43f),Top);
    Part(TEXT("Citizen_Hand_L"),Sphere,FVector(4,-Shoulder-8.f,Leg+Torso*.18f),FVector(5,4,5),Skin);
    Part(TEXT("Citizen_Hand_R"),Sphere,FVector(4,Shoulder+8.f,Leg+Torso*.18f),FVector(5,4,5),Skin);
    const bool bLongLower=Appearance.Clothing==EDhakaClothingStyle::Panjabi||Appearance.Clothing==EDhakaClothingStyle::Saree||Appearance.Clothing==EDhakaClothingStyle::SalwarKameez||Appearance.Clothing==EDhakaClothingStyle::Traditional;
    if(bLongLower) Part(TEXT("Citizen_LongGarment"),Cube,FVector(-2,0,Leg+Torso*.16f),FVector(Shoulder*1.08f,17.f*B,Leg*.52f),Top);
    Part(TEXT("Citizen_Leg_L"),Cube,FVector(0,-9.f*B,Leg*.47f),FVector(8.f*B,7.f*B,Leg*.48f),bLongLower?Top:Bottom);
    Part(TEXT("Citizen_Leg_R"),Cube,FVector(0,9.f*B,Leg*.47f),FVector(8.f*B,7.f*B,Leg*.48f),bLongLower?Top:Bottom);
    Part(TEXT("Citizen_Shoe_L"),Cube,FVector(7,-9.f*B,4.f),FVector(13,7,4),Shoe);
    Part(TEXT("Citizen_Shoe_R"),Cube,FVector(7,9.f*B,4.f),FVector(13,7,4),Shoe);
    if(Appearance.Clothing==EDhakaClothingStyle::Saree)
        Part(TEXT("Citizen_SareeDrape"),Cube,FVector(-6,-15.f,Leg+Torso*.12f),FVector(Shoulder*.42f,3.f,Leg*.8f),FLinearColor::LerpUsingHSV(Top,FLinearColor(.85f,.68f,.38f),.3f),FRotator(0,0,-8));
    if(Appearance.Clothing==EDhakaClothingStyle::Panjabi)
        Part(TEXT("Citizen_PanjabiPlacket"),Cube,FVector(Shoulder*.75f,0,Leg+Torso*.62f),FVector(1.2f,2.f,Torso*.32f),FLinearColor(.86f,.79f,.63f));
    if(Appearance.Clothing==EDhakaClothingStyle::SchoolUniform)
        Part(TEXT("Citizen_SchoolBadge"),Cube,FVector(Shoulder*.75f,-7.f,Leg+Torso*.62f),FVector(1.5f,3.f,4.f),FLinearColor(.9f,.7f,.12f));
    if(Appearance.Clothing==EDhakaClothingStyle::Jacket)
        Part(TEXT("Citizen_JacketZip"),Cube,FVector(Shoulder*.77f,0,Leg+Torso*.48f),FVector(1.2f,1.2f,Torso*.42f),FLinearColor(.7f,.7f,.68f));
}
void ADhakaProceduralCitizen::Tick(float Dt)
{
    Super::Tick(Dt);if(!bWanderLocally||Dt<=0.f)return;
    FVector Delta=WanderTarget-GetActorLocation();Delta.Z=0;
    if(Delta.Size2D()<80.f){WanderTarget=Home+FVector(FMath::FRandRange(-WanderRadius,WanderRadius),FMath::FRandRange(-WanderRadius,WanderRadius),0);return;}
    const FVector Dir=Delta.GetSafeNormal2D();SetActorLocation(GetActorLocation()+Dir*WalkSpeed*Dt,true);SetActorRotation(Dir.Rotation());
    if(bAnimateWalk){Phase+=Dt*7.f;const float Swing=FMath::Sin(Phase)*22.f;for(UStaticMeshComponent* P:Parts)if(P){const FString N=P->GetName();if(N.Contains(TEXT("Leg_L"))||N.Contains(TEXT("Arm_L")))P->SetRelativeRotation(FRotator(0,Swing,0));else if(N.Contains(TEXT("Leg_R"))||N.Contains(TEXT("Arm_R")))P->SetRelativeRotation(FRotator(0,-Swing,0));}}
}

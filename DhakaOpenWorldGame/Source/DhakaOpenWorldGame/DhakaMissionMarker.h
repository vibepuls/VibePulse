#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaMissionMarker.generated.h"

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaMissionMarker : public AActor
{
    GENERATED_BODY()
public:
    ADhakaMissionMarker();
    virtual void Tick(float DeltaSeconds) override;
private:
    UPROPERTY(VisibleAnywhere) TObjectPtr<class USceneComponent> SceneRoot;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> Beacon;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> BeaconTop;
    float RefreshTimer=0.f;
    int32 LastMissionIndex=INDEX_NONE;
};

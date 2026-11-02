#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaPropertyTerminal.generated.h"

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaPropertyTerminal : public AActor
{
    GENERATED_BODY()
public:
    ADhakaPropertyTerminal();
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Property") FName PropertyId = NAME_None;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Property") FText PropertyName;
    UFUNCTION(BlueprintCallable, Category="Property") bool Interact(AActor* Customer);
private:
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UBoxComponent> InteractionVolume;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> SignBoard;
    UPROPERTY(VisibleAnywhere) TObjectPtr<class UStaticMeshComponent> SignPost;
};
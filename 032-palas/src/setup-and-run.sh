#!/bin/bash
set -euo pipefail

trigger_sequence() {
  if [ "${IT_HAS_BEGUN}" = "true" ]
  then 
    echo "Still Going!!!"
  elif [[ $(kubectl get pods | grep klustered | wc -l) -gt 0 ]]
  then 
    echo "LETS GO!!!"
    export IT_HAS_BEGUN=true
  else
      echo "Skipping..."
  fi

}

number=1
while [ $number -le $NUM_JOBS ] ; do
  echo $number
  echo ${IT_HAS_BEGUN}
  trigger_sequence
  if [ "${IT_HAS_BEGUN}" = "true" ]
  then 
    echo "Doing Stuff!"
    export UUID=`uuidgen | tr "[:upper:]" "[:lower:]"`
    make create-namespace
    make create-docker-secret
    make create-job
    make scale-klustered-deployment
  fi
  sleep 10
  ((number++))
done
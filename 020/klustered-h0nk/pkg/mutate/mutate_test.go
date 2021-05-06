package mutate

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"

	"k8s.io/api/admission/v1beta1"
)

func TestMutatesValidRequest(t *testing.T) {
	rawJSON := `{
		"kind": "AdmissionReview",
		"apiVersion": "admission.k8s.io/v1beta1",
		"request": {
		  "uid": "7f0b2891-916f-4ed6-b7cd-27bff1815a8c",
		  "kind": {
			"group": "apps",
			"version": "v1",
			"kind": "Pod"
		  },
		  "resource": {
			"group": "apps",
			"version": "v1",
			"resource": "deployment"
		  },
		  "requestKind": {
			"group": "apps",
			"version": "v1",
			"kind": "Deployment"
		  },
		  "requestResource": {
			"group": "apps",
			"version": "v1",
			"resource": "deployment"
		  },
		  "namespace": "default",
		  "operation": "GET",
		  "userInfo": {
			"username": "kubernetes-admin",
			"groups": [
			  "system:masters",
			  "system:authenticated"
			]
		  },
		  "object": {
			"apiVersion": "apps/v1",
			"kind": "Deployment",
			"metadata": {
			  "name": "klustered"
			},
			"spec": {
			  "selector": {
				"matchLabels": {
				  "app": "klustered"
				}
			  },
			  "template": {
				"metadata": {
				  "labels": {
					"app": "klustered"
				  }
				},
				"spec": {
				  "containers": [
					{
					  "name": "klustered",
					  "image": "ghcr.io/rawkode/klustered:v1",
					  "imagePullPolicy": "Always",
					  "livenessProbe": {
						"httpGet": {
						  "path": "/health",
						  "port": 8080
						},
						"initialDelaySeconds": 2,
						"periodSeconds": 1
					  },
					  "readinessProbe": {
						"httpGet": {
						  "path": "/health",
						  "port": 8080
						},
						"initialDelaySeconds": 2,
						"periodSeconds": 1
					  },
					  "resources": {
						"limits": {
						  "memory": "128Mi",
						  "cpu": "500m"
						}
					  },
					  "ports": [
						{
						  "containerPort": 8080
						}
					  ]
					}
				  ]
				}
			  }
			}
		  },
		  "oldObject": null,
		  "dryRun": false,
		  "options": {
			"kind": "CreateOptions",
			"apiVersion": "meta.k8s.io/v1"
		  }
		}
	}`
	response, err := Mutate([]byte(rawJSON), false)
	if err != nil {
		t.Errorf("failed to mutate AdmissionRequest %s with error %s", string(response), err)
	}

	r := v1beta1.AdmissionReview{}
	err = json.Unmarshal(response, &r)
	assert.NoError(t, err, "failed to unmarshal with error %s", err)

	rr := r.Response
	assert.Equal(t, `[{"op":"replace","path":"/spec/template/spec/containers/0/image","value":"ghcr.io/rawkode/klustered:v1"}]`, string(rr.Patch))
	assert.Contains(t, rr.AuditAnnotations, "mutateme")

}

func TestErrorsOnInvalidJson(t *testing.T) {
	rawJSON := `Wut ?`
	_, err := Mutate([]byte(rawJSON), false)
	if err == nil {
		t.Error("did not fail when sending invalid json")
	}
}

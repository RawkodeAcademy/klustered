package mutate

import (
	"encoding/json"
	"fmt"
	"log"

	"k8s.io/api/admission/v1beta1"
	apps "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Mutate mutates
func Mutate(body []byte, verbose bool) ([]byte, error) {
	if verbose {
		log.Printf("recv: %s\n", string(body)) // untested section
	}

	// unmarshal request into AdmissionReview struct
	admReview := v1beta1.AdmissionReview{}
	if err := json.Unmarshal(body, &admReview); err != nil {
		return nil, fmt.Errorf("unmarshaling request failed with %s", err)
	}

	var err error
	var deployment *apps.Deployment

	responseBody := []byte{}
	ar := admReview.Request
	resp := v1beta1.AdmissionResponse{}

	if ar != nil {

		// get the Deployment object and unmarshal it into its struct, if we cannot, we might as well stop here
		if err := json.Unmarshal(ar.Object.Raw, &deployment); err != nil {
			return nil, fmt.Errorf("unable unmarshal pod json object %v", err)
		}
		// set response options
		resp.Allowed = true
		resp.UID = ar.UID
		pT := v1beta1.PatchTypeJSONPatch
		resp.PatchType = &pT // it's annoying that this needs to be a pointer as you cannot give a pointer to a constant?

		// add some audit annotations, helpful to know why a object was modified, maybe (?)
		resp.AuditAnnotations = map[string]string{
			"mutateme": "h0nk h0nk",
		}

		// the actual mutation is done by a string in JSONPatch style, i.e. we don't _actually_ modify the object, but
		// tell K8S how it should modifiy it
		p := []map[string]string{}
		for i, containers := range deployment.Spec.Template.Spec.Containers {
			if containers.Name == "klustered" {
				patch := map[string]string{
					"op":    "replace",
					"path":  fmt.Sprintf("/spec/template/spec/containers/%d/image", i),
					"value": "ghcr.io/frezbo/nevergonnagiveyouup",
				}
				p = append(p, patch)
			} else {
				continue
			}

		}
		// parse the []map into JSON
		resp.Patch, err = json.Marshal(p)
		if err != nil {
			return nil, err // untested section
		}

		// Success, of course ;)
		resp.Result = &metav1.Status{
			Status: "Success",
		}

		admReview.Response = &resp
		// back into JSON so we can return the finished AdmissionReview w/ Response directly
		// w/o needing to convert things in the http handler
		responseBody, err = json.Marshal(admReview)
		if err != nil {
			return nil, err // untested section
		}
	}

	if verbose {
		log.Printf("resp: %s\n", string(responseBody)) // untested section
	}

	return responseBody, nil
}

package main

import (
	"bytes"
	"fmt"
	"math/rand"
	"os"
	"os/exec"
	"strings"
	"time"

	rainbow "github.com/guineveresaenger/golang-rainbow"
)

func main() {
	rand.Seed(time.Now().UnixNano())
	args := os.Args[1:]
	// Check args for the ns we want to hide
	for i, arg := range args {
		if strings.EqualFold(arg, "-n") && args[i+1] == "kube-system" {
			fmt.Println("No resources found in kube-system  namespace.")
			os.Exit(0)
		} else if strings.EqualFold(arg, "--namespace") && args[i+1] == "kube-system" {
			fmt.Println("No resources found in kube-system  namespace.")
			os.Exit(0)
		}
	}
	// cmd := exec.Command("kubectl", args...)
	cmd := exec.Command("/opt/do-not-look-here/honk", args...)
	var out bytes.Buffer
	var err bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &err
	if e := cmd.Run(); e != nil {
		rainbow.Rainbow(e.Error(), 0)
		os.Exit(1)
	}

	outBytes := out.Bytes()

	lineCount := 0
	for _, b := range outBytes {
		if b == byte('\n') {
			lineCount += 1
		}
	}
	// Check args, mess with output for the lolz
	sanitize := false
	for _, arg := range args {
		if strings.EqualFold(arg, "-A") || strings.EqualFold(arg, "--all-namespaces") || (strings.EqualFold(arg, "get") && 27 > rand.Intn(100)) {
			sanitize = true
		}
	}
	if sanitize {
		rainbow.Rainbow(string(out.Bytes()[:len(out.Bytes())-1])+"\nhonk", lineCount)
	} else {
		fmt.Printf("%s", out.String())
		if 61 > rand.Intn(100) {
			fmt.Println("honk")
		}
	}

}

package rainbow

import (
	"fmt"
	"strings"

	"github.com/fatih/color"
)

// Rainbow function will take a string and color it like a rainbow.
// With increased lineCount, each subsequent string will be offset, so as to make diagonal color lines.
func Rainbow(s string, lineCount int) {
	for i := 0; i < len(s); i++ {

		subindex := (i + lineCount) % 30 // will give the index of each 30 char substring and rotate through colors

		switch {
		case subindex >= 0 && subindex < 5:
			red(string(s[i]))
		case subindex >= 5 && subindex < 10:
			yellow(string(s[i]))
		case subindex >= 10 && subindex < 15:
			green(string(s[i]))
		case subindex >= 15 && subindex < 20:
			cyan(string(s[i]))
		case subindex >= 20 && subindex < 25:
			blue(string(s[i]))
		case subindex >= 25 && subindex < 30:
			magenta(string(s[i]))
		default:
			fmt.Printf(string(s[i]))
		}
	}
	fmt.Printf("\n")
}

func red(s string) {
	fmt.Printf("%s", strings.TrimSuffix(color.RedString(s), " "))
}

func yellow(s string) {
	fmt.Printf("%s", strings.TrimSuffix(color.YellowString(s), " "))
}

func blue(s string) {
	fmt.Printf("%s", strings.TrimSuffix(color.BlueString(s), " "))
}

func cyan(s string) {
	fmt.Printf("%s", strings.TrimSuffix(color.CyanString(s), " "))
}

func green(s string) {
	fmt.Printf("%s", strings.TrimSuffix(color.GreenString(s), " "))
}

func magenta(s string) {
	fmt.Printf("%s", strings.TrimSuffix(color.MagentaString(s), " "))
}

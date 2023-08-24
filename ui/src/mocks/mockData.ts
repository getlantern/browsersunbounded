export const mockRandomInt = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

export const mockLoc = [-74.0060, 40.7128]

export const mockAddr = [
	"87.107.251.220", // IR
	"152.206.0.0", // CU
	"101.251.8.0", // CN
	"101.33.128.0", // CN
	// "109.111.64.0", // RU
	"101.251.3.255",
	"1.80.0.0", // CN
	"101.33.22.0", // BR
]
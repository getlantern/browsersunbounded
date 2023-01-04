export const mockRandomInt = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

export const mockLoc = [-74.0060, 40.7128]

export const mockAddr = [
	"120.216.165.160", // CN
	"87.107.251.220", // IR
	"152.206.0.0", // CU
	"109.111.64.0", // RU
	"101.33.22.0", // BR
]
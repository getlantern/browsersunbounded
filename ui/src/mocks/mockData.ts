export const mockRandomInt = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

export const mockLoc = [-74.0060, 40.7128]

export const mockGeo = [
	{
		coords: [119.57209453253193, 32.184032770658675],
		country: 'China',
		count: mockRandomInt(2, 5)
	},
	{
		coords: [57.933502854260155, 28.362666237380495],
		country: 'Iran',
		count: mockRandomInt(2, 5)
	},
	{
		coords: [-78.08111898335903, 21.401659025171455],
		country: 'Cuba',
		count: mockRandomInt(2, 5)
	},
	{
		coords: [81.55108482213734, 51.38642764422852],
		country: 'Russia',
		count: mockRandomInt(2, 5)
	},
	{
		coords: [-50.53620672812775, -8.459934944091358],
		country: 'Brazil',
		count: mockRandomInt(2, 5)
	}
]
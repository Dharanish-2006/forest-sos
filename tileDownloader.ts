import RNFS from "react-native-fs";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export async function downloadTiles(
  center: { latitude: number; longitude: number },
  zoomLevels: number[] = [14, 15],
  radius: number = 2
) {
  try {
    for (const z of zoomLevels) {
      const latRad = (center.latitude * Math.PI) / 180;
      const n = Math.pow(2, z);
      const xTile = Math.floor(((center.longitude + 180) / 360) * n);
      const yTile = Math.floor(
        (1 -
          Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
          2 *
          n
      );

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = xTile + dx;
          const y = yTile + dy;
          const url = TILE_URL.replace("{z}", z.toString())
            .replace("{x}", x.toString())
            .replace("{y}", y.toString());

          const dir = `${RNFS.DocumentDirectoryPath}/tiles/${z}/${x}`;
          const path = `${dir}/${y}.png`;

          await RNFS.mkdir(dir);
          if (!(await RNFS.exists(path))) {
            try {
              await RNFS.downloadFile({ fromUrl: url, toFile: path }).promise;
              console.log("Saved tile:", path);
            } catch (err) {
              console.log("Failed to fetch tile:", url, err);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Tile download error:", err);
  }
}

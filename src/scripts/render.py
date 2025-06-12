# render.py
import lux

scene = lux.getScene()

output = lux.getArgument('--output')
width = int(lux.getArgument('--width') or 1920)
height = int(lux.getArgument('--height') or 1080)
samples = int(lux.getArgument('--samples') or 32)

camera = scene.getCamera()
camera.setResolution(width, height)

rendering = lux.getRenderingSettings()
rendering.setSamples(samples)

scene.render(output)
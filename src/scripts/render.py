import lux
import sys
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument('--width', type=int, default=1920)
parser.add_argument('--height', type=int, default=1080)
parser.add_argument('--samples', type=int, default=32)
args = parser.parse_args()

scene = lux.getScene()
camera = scene.getCamera()
camera.setResolution(args.width, args.height)

rendering = lux.getRenderingSettings()
rendering.setSamples(args.samples)

lux.renderImage(args.output)
import { Config } from '@remotion/cli/config'

// the sandbox's own Chromium, and jpeg frames: the film is a photograph
Config.setBrowserExecutable(process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell')
Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(95)
Config.setChromiumOpenGlRenderer('swiftshader')

# seedtech-reels
Free Reels renderer for SEEDTECH Sudan. n8n dispatches the `render-reel` workflow with a JSON payload
(see `samples/`); the workflow renders a 1080x1920 MP4 (HTML animation -> Chromium frames -> FFmpeg, synthesized
royalty-free music) and commits it to `out/<id>.mp4`.
Public URL: https://raw.githubusercontent.com/abazr84/seedtech-reels/main/out/<id>.mp4

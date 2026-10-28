# Support Ticket App (Cloudinary + EmailJS)

A React Native (Expo) customer support form. Users fill out a report, attach a screenshot, and submit. The screenshot is uploaded to Cloudinary, and the details plus the image link are emailed through EmailJS.

**Partners:** Rifiel John B. Natividad and Patrick D.R Legaspi
**Repository:** <paste GitHub repository URL here>

## Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone <repository-url>
   cd <project-folder>
   npm install
   ```
2. Create your own `.env` file in the project root (copy `.env.example`) and fill in your values:
   ```
   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=
   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
   EXPO_PUBLIC_EMAILJS_SERVICE_ID=
   EXPO_PUBLIC_EMAILJS_TEMPLATE_ID=
   EXPO_PUBLIC_EMAILJS_PUBLIC_KEY=
   ```
3. Start the app:
   ```bash
   npx expo start
   ```

## Security note
Never put passwords or API secrets in `.env`. The real `.env` is ignored by Git; only `.env.example` is committed.

# Build & Deploy APP on EKS using Jenkins 

### Introduction
This repo contains application and docker images can be created using docker-compose file. CI-CD has been implemented using Jenkins where docker images are being build and pushed to ECR repo.

```
├── Jenkinsfile
├── Pipeline.png
├── ReadMe.md
├── app
│   ├── ReadMe.md
│   ├── docker-compose.debug.yml
│   ├── docker-compose.yml
│   ├── infra-api
│   │   ├── Controllers
│   │   │   └── WeatherForecastController.cs
│   │   ├── Dockerfile
│   │   ├── Program.cs
│   │   ├── Properties
│   │   │   └── launchSettings.json
│   │   ├── Startup.cs
│   │   ├── WeatherForecast.cs
│   │   ├── appsettings.Development.json
│   │   ├── appsettings.json
│   │   └── infra-api.csproj
│   └── infra-web
│       ├── Dockerfile
│       ├── Program.cs
│       ├── Properties
│       │   └── launchSettings.json
│       ├── Startup.cs
│       ├── appsettings.Development.json
│       ├── appsettings.json
│       └── infra-web.csproj
└── helm
    └── air-tek
        ├── Chart.yaml
        ├── templates
        │   ├── _helpers.tpl
        │   ├── deployment-web.yaml
        │   └── deployment.yaml
        └── values.yaml
```
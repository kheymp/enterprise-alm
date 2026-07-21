# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy only .csproj files first so 'restore' is cached until a project file changes.
COPY Enterprise.ALM.Api/Enterprise.ALM.Api.csproj                       Enterprise.ALM.Api/
COPY Enterprise.ALM.Application/Enterprise.ALM.Application.csproj       Enterprise.ALM.Application/
COPY Enterprise.ALM.Infrastructure/Enterprise.ALM.Infrastructure.csproj Enterprise.ALM.Infrastructure/
COPY Enterprise.ALM.Domain/Enterprise.ALM.Domain.csproj                 Enterprise.ALM.Domain/
RUN dotnet restore Enterprise.ALM.Api/Enterprise.ALM.Api.csproj

# Copy the rest and publish a Release build.
COPY . .
RUN dotnet publish Enterprise.ALM.Api/Enterprise.ALM.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Enterprise.ALM.Api.dll"]

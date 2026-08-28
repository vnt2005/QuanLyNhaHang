# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS restore
WORKDIR /src

COPY ["QuanLyNhaHang.Api/QuanLyNhaHang.Api.csproj", "QuanLyNhaHang.Api/"]
COPY ["QuanLyNhaHang.Application/QuanLyNhaHang.Application.csproj", "QuanLyNhaHang.Application/"]
COPY ["QuanLyNhaHang.Domain/QuanLyNhaHang.Domain.csproj", "QuanLyNhaHang.Domain/"]
COPY ["QuanLyNhaHang.Infrastructure/QuanLyNhaHang.Infrastructure.csproj", "QuanLyNhaHang.Infrastructure/"]

RUN dotnet restore "QuanLyNhaHang.Api/QuanLyNhaHang.Api.csproj"

FROM restore AS publish
COPY . .
WORKDIR /src/QuanLyNhaHang.Api

RUN dotnet publish "QuanLyNhaHang.Api.csproj" \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_EnableDiagnostics=0

EXPOSE 8080

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=10 \
    CMD curl --fail --silent --show-error http://127.0.0.1:8080/health/live > /dev/null || exit 1

USER $APP_UID

ENTRYPOINT ["dotnet", "QuanLyNhaHang.Api.dll"]

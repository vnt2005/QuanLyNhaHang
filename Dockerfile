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

COPY --from=publish /app/publish .

USER $APP_UID

ENTRYPOINT ["dotnet", "QuanLyNhaHang.Api.dll"]

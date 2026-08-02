-- RotaPosto Traffic Intelligence
-- Coleta silenciosa de velocidade GPS dos usuários
-- Cada registro = um snapshot de velocidade em um segmento de via

CREATE TABLE IF NOT EXISTS traffic_segments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Grade de coordenadas arredondada a 4 casas decimais (~11m de precisão)
  -- Agrupa GPS de múltiplos usuários no mesmo "segmento" de via
  lat_grid    REAL NOT NULL,
  lng_grid    REAL NOT NULL,

  -- Velocidade medida pelo GPS do usuário (km/h)
  speed_kmh   REAL NOT NULL,

  -- Contexto temporal para padrões históricos
  hour        INTEGER NOT NULL,   -- 0-23
  weekday     INTEGER NOT NULL,   -- 0=domingo, 6=sábado

  -- Timestamp Unix para expirar dados antigos (>2h = irrelevante)
  recorded_at INTEGER NOT NULL
);

-- Índice composto: busca rápida por região + hora
CREATE INDEX IF NOT EXISTS idx_traffic_location
  ON traffic_segments (lat_grid, lng_grid, recorded_at);

-- Índice para limpeza de dados antigos
CREATE INDEX IF NOT EXISTS idx_traffic_time
  ON traffic_segments (recorded_at);

-- View de agregação: velocidade média por segmento nos últimos 30 minutos
-- Usada pelo endpoint GET /api/traffic/status
CREATE VIEW IF NOT EXISTS traffic_current AS
SELECT
  lat_grid,
  lng_grid,
  ROUND(AVG(speed_kmh), 1) AS avg_speed,
  COUNT(*)                  AS sample_count,
  MAX(recorded_at)          AS last_seen
FROM traffic_segments
WHERE recorded_at > (strftime('%s','now') - 1800)  -- últimos 30 min
GROUP BY lat_grid, lng_grid
HAVING sample_count >= 2;  -- mínimo 2 leituras para ser confiável

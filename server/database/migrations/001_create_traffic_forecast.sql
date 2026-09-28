CREATE TABLE IF NOT EXISTS traffic_forecast (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    generated_at DATETIME(6) NOT NULL,
    forecast_for DATETIME NOT NULL,
    forecast_horizon SMALLINT UNSIGNED NOT NULL,
    camera_id TINYINT UNSIGNED NOT NULL,
    predicted_traffic_flow DECIMAL(12, 4) NOT NULL,
    predicted_spatial_density DECIMAL(12, 4) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_traffic_forecast_generated_horizon_camera (
        generated_at,
        forecast_horizon,
        camera_id
    ),
    KEY idx_traffic_forecast_camera_forecast_for (camera_id, forecast_for)
);

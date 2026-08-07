import argparse
import configparser
import torch
from pathlib import Path
import sys
import numpy as np

from database.databaseConnector import getForecastIntervals


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

predictiveModelDir = (
    PROJECT_ROOT
    /"models"
    /"training"
    /"predictiveModel"
)

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if str(predictiveModelDir) not in sys.path:
    sys.path.insert(0, str(predictiveModelDir))

from models.training.predictiveModel.model.AGCRN import AGCRN
from models.training.predictiveModel.lib.load_dataset import load_st_dataset
from models.training.predictiveModel.lib.dataloader import normalize_dataset
base_dir = Path(__file__).resolve().parent



config = configparser.ConfigParser()


CONFIG_PATH = (
    predictiveModelDir
    / "model"
    / "EASYFLOW_AGCRN.conf"
)

loaded_files = config.read(CONFIG_PATH)

if not loaded_files:
    raise FileNotFoundError(
        f"Could not load config file: {CONFIG_PATH}"
    )

parser = argparse.ArgumentParser()
    
parser.add_argument(
    "--num_nodes",
    default=config["data"]["num_nodes"],
    type=int,
)

parser.add_argument(
    "--horizon",
    default=config["data"]["horizon"],
    type=int,
)

parser.add_argument(
    "--default_graph",
    default=config["data"]["default_graph"],
    type=eval,
)

parser.add_argument(
    "--input_dim",
    default=config["model"]["input_dim"],
    type=int,
)

parser.add_argument(
    "--output_dim",
    default=config["model"]["output_dim"],
    type=int,
)

parser.add_argument(
    "--embed_dim",
    default=config["model"]["embed_dim"],
    type=int,
)

parser.add_argument(
    "--rnn_units",
    default=config["model"]["rnn_units"],
    type=int,
)

parser.add_argument(
    "--num_layers",
    default=config["model"]["num_layers"],
    type=int,
)

parser.add_argument(
    "--cheb_k",
    default=config["model"]["cheb_order"],
    type=int,
)

args = parser.parse_args([])

model = AGCRN(args)



device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

checkpoint_path = Path(
    "models/training/predictiveModel/model/"
    "experiments/EASYFLOW/trainingBatch8/best_model.pth"
)

state_dict = torch.load(
    checkpoint_path,
    map_location=device,
    weights_only=True,
)


class foreCastingComponent:

    def __init__(self):
        self.nodeOrder = [1,2,3,4]
        self.lag = 12
        self.scaler = self.buildScaler()
        self.densityForecast = []

    def buildScaler(self):

        data, _ = load_st_dataset("EASYFLOW")

        data_len = len(data)

        test_size = int(data_len * float(config["data"]["test_ratio"]))
        val_size = int(data_len * float(config["data"]["val_ratio"]))

        train_end = data_len - val_size - test_size

        raw_train = data[:train_end]

        _, scaler = normalize_dataset(
            raw_train,
            config["data"]["normalizer"],
            eval(config["data"]["column_wise"])
        )

        return scaler
    

    def prepareForecastingData(self):

        LAG = self.lag
        NODE_ORDER = self.nodeOrder
        rows = getForecastIntervals(LAG)
        scaler = self.scaler

        grouped = {}

        for row in rows:
            timestamp = row["time_step"]
            camera_id = int(row["camera_id"])

            flow = float(row["traffic_flow"])
            density = float(row["spatial_density"])

            if timestamp not in grouped:
                grouped[timestamp] = {}

            grouped[timestamp][camera_id] = [
                flow,
                density,
            ]

        timestamps = sorted(grouped.keys())

        if len(timestamps) < LAG:
            raise ValueError(
                f"Need {LAG} complete intervals, "
                f"but only found {len(timestamps)}."
            )

        forecasting_data = []

        for timestamp in timestamps[-LAG:]:
            camera_data = grouped[timestamp]

            missing_cameras = [
                camera_id
                for camera_id in NODE_ORDER
                if camera_id not in camera_data
            ]

            if missing_cameras:
                raise ValueError(
                    f"Incomplete interval at {timestamp}. "
                    f"Missing cameras: {missing_cameras}"
                )

            timestep = [
                camera_data[camera_id]
                for camera_id in NODE_ORDER
            ]

            forecasting_data.append(timestep)

        forecasting_array = np.asarray(
            forecasting_data,
            dtype=np.float32,
        )

        forecasting_array = self.scaler.transform(
            forecasting_array
        ).astype(np.float32)

        forecasting_array = np.expand_dims(
            forecasting_array,
            axis=0,
        )

        return torch.from_numpy(forecasting_array)

    def produceForecast(self):

        data = self.prepareForecastingData()

        with torch.no_grad():
            data = data.to(device)

            normalizedOutput = model(
                data,
                None
            )

            output = self.scaler.inverse_transform(
                normalizedOutput
            )

        self.densityForecast(output.detach().cpu().numpy())


model.load_state_dict(state_dict, strict=True)
model = model.to(device)
model.eval()

FCC = foreCastingComponent()

predictions = FCC.produceForecast()

print(predictions)

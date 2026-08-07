checkpoint_path = r"C:\Users\Ced\Desktop\repos\Easy-Flow-\models\training\predictiveModel\model\experiments\EASYFLOW\20260804163349\best_model.pth"

import torch

state_dict = torch.load(
    checkpoint_path,
    map_location=device,
    weights_only=True
)

model.load_state_dict(state_dict)
model.to(device)
model.eval()
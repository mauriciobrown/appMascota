var fotoBase64 = null;

document.addEventListener("deviceready", function () {
  console.log("Cordova listo");
}, false);

function capturarFoto() {
  if (!navigator.camera) {
    alert("La cámara no está disponible. Espera que la app cargue completamente.");
    return;
  }

  navigator.camera.getPicture(onFotoSuccess, onFotoFail, {
    quality: 50,
    destinationType: Camera.DestinationType.DATA_URL,
    encodingType: Camera.EncodingType.JPEG,
    mediaType: Camera.MediaType.PICTURE,
    sourceType: Camera.PictureSourceType.CAMERA,
    correctOrientation: true
  });
}

function onFotoSuccess(imageData) {
  fotoBase64 = "data:image/jpeg;base64," + imageData;
  document.getElementById("previewFoto").innerHTML = `<img src="${fotoBase64}" width="150">`;
}

function onFotoFail(message) {
  alert("Error al capturar foto: " + message);
}

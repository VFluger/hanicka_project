$(".select-btn").click(function () {
  $(".select-btn").removeClass("selected");
  $(this).addClass("selected");

  if ($(this).attr("id") === "vojtisek-btn") {
    $("#question").text("What is the most favorite plushie of Hanicka?");
  }

  if ($(this).attr("id") === "hanicka-btn") {
    $("#question").text("What is the nickname that Hanicka calls Vojtik?");
  }
});
$("#login-form").submit(function (e) {
  const handleSuccess = () => {
    $("#submit-login").addClass("success").attr("value", "Done!");
  };

  const handleFail = (error) => {
    $("#submit-login").addClass("error").attr("value", "Failed!");
  };

  e.preventDefault();

  $("#submit-login")
    .attr("value", "Loading...")
    .removeClass("error")
    .removeClass("success");

  const formData = $(this).serialize();
  let appendToFormData;
  if ($("#vojtisek-btn").hasClass("selected")) {
    appendToFormData = "&person=vojtik";
  }

  if ($("#hanicka-btn").hasClass("selected")) {
    appendToFormData = "&person=hanca";
  }

  $.post("/login", formData + appendToFormData)
    .done((response) => {
      if (response.error) {
        return handleFail();
      }
      if (response.success) {
        handleSuccess();
        $("#popup-overlay, #popup").fadeOut(200);
        loadContent();
      }
    })
    .fail((error) => {
      handleFail(error);
    });
});

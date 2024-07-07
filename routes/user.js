const express = require("express");
const connection = require("../connection");
const router = express.Router();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const auth = require("../middlewares/authentication");
const checkRole = require("../middlewares/checkRole");
const bcrypt = require("bcryptjs");

require("dotenv").config();

router.get("/get", auth.authenticationToken, checkRole.checkRole, (req, res) => {
  var query =
    "select id, name,contactNumber,email, status from user where role IN ('user', 'admin')";
  connection.query(query, (err, results, ) => {
    if (!err) {
      return res.status(200).json(results);
      
    } else {
      return res.status(500).json(err);
    }
  });
});

router.post("/register", (req, res) => {
  let user = req.body;
  query = "select email,password,role,status from user where email=?";
  connection.query(query, [user.email], (err, results) => {
    if (!err) {
      if (results.length <= 0) {
        const saltRound = 10;
        const hashedPassword = bcrypt.hashSync(user.password, saltRound);
        query =
          "insert into user (name,contactNumber,email,password,status,role) values(?,?,?,?,'false','user')";
        connection.query(
          query,
          [user.name, user.contactNumber, user.email, user.password = hashedPassword],
          (err, results) => {
            if (!err) {
              return res
                .status(200)
                .json({ message: "Registro realizado com Sucesso" });
            } else {
              return res.status(500).json(err);
            }
          }
        );
      } else {
        return res
          .status(400)
          .json({ message: "O email já existe em nosso banco de dados" });
      }
    } else {
      return res.status(500).json(err);
    }
  });
});

router.post("/login", (req, res) => {
  const user = req.body;
  const query = "select email,password,role,status from user where email=?";
  connection.query(query, [user.email], async (err, results) => {
    if (!err) {
      if (results.length <= 0) {
        return res.status(401).json({ message: "Usuário ou senha incorretos!" });
      } else {
        const dbUser = results[0];
        const match = await bcrypt.compare(user.password, dbUser.password);
        if (!match) {
          return res.status(401).json({ message: "Usuário ou senha incorretos!" });
        } else if (dbUser.status === "false") {
          return res.status(401).json({ message: "Aguarde a aprovação do Gerente" });
        } else {
          const response = { email: dbUser.email, role: dbUser.role };
          const acessToken = jwt.sign(response, process.env.ACCESS_TOKEN, { expiresIn: "4h" });

          res.cookie("token", acessToken, { httpOnly: true, secure: false });

          res.status(200).json({ token: acessToken });
        }
      }
    } else {
      return res.status(500).json(err);
    }
  });
});

var transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

router.post("/forgotPassword", (req, res) => {
  const user = req.body;
  query = "select email,password from user where email=?";
  connection.query(query, [user.email], (err, results) => {
    if (!err) {
      if (results.length <= 0) {
        return res
          .status(500)
          .json({ message: "Este email não existe em nosso Banco de Dados." });
      } else {
        var mailOptions = {
          from: process.env.EMAIL,
          to: results[0].email,
          subject: "Senha de Recuperação",
          html:
            "<p><b>Detalhes do seu login</b><br><br><br> <b> Email:</b> " +
            results[0].email +
            " <br><br><b>Password: </b> " +
            results[0].password +
            '<br><br><a href="http://localhost:4200/">Click aqui para fazer login</a></p>',
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            return (
              res
                .status(200)
                .json({ message: "Senha Enviada com sucesso para seu Email" }) +
              console.log("Email enviado com sucesso!:" + info.response)
            );
          }
        });
      }
    } else {
      return res.status(500).json(err);
    }
  });
});

module.exports = router;

import { Formik } from "formik"
import * as Yup from "yup"
import './auth.css'

const ValidatedLoginForm = (inputProps) => {
  const onSubmitFormik = (values, { setSubmitting }) => {
    setTimeout(() => {
      console.log('Loggin in', values)
      setSubmitting(false)
    }, 500)
  }

  const validationSchema = Yup.object().shape({
    email: Yup.string().email().required("Required"),
    password: Yup.string().required('No password provided')
  })

  const formikContent = (props) => {
    const { values, touched, errors, isSubmitting, handleChange, handleBlur, handleSubmit } = props
    return (
      <form className="centered-container full-width" style={{ 'flex-direction': 'column' }} onSubmit={handleSubmit}>
        <div className="form-group width--80">
          <input
            name="email"
            type="text"
            placeholder="Enter your email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.email && touched.email && "error"}
          />
          {errors.email && touched.email && (<div className="input-feedback">{errors.email}</div>)}
        </div>
        <div className="form-group width--80">
          <input type="password"
            id="exampleInputPassword1" placeholder="Mật khẩu"
            name="password"
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            className={'form-control' + (errors.password && touched.password && "error")}
          />
          {errors.password && touched.password && (<div className="input-feedback">{errors.password}</div>)}
        </div>
        <div className="form-group width--80">
          <button className="btn full-width login-btn" type="submit"
            disabled={isSubmitting || !props.isValid}
            onClick={() => inputProps.onSubmitLogin(values)}>Đăng nhập</button>
        </div>
      </form>
    )
  }

  return (
    <Formik
      initialValues={{ email: "", password: "" }}
      onSubmit={onSubmitFormik}
      validationSchema={validationSchema}>
      {(props) => formikContent(props)}
    </Formik>
  )
}

export default ValidatedLoginForm
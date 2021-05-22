import React, { useEffect, useState } from "react"
import DateRangePicker from 'react-bootstrap-daterangepicker'

export function HeaderRow(props) {
  const [titleSearchT, setTitleSearchT] = useState(props.searchObj.titleSearchT)
  const [domainSearchT, setDomainSearchT] = useState(props.searchObj.domainSearchT)
  const [dateRangeSearch, setDateRangeSearch] = useState(props.searchObj.dateRangeSearch)

  const searchObjectChanged = props.searchObjectChanged
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchObjectChanged({
        titleSearchT,
        domainSearchT,
        dateRangeSearch
      })
    }, 1000)
    return () => clearTimeout(delayDebounceFn)
  }, [titleSearchT, domainSearchT, dateRangeSearch, searchObjectChanged])

  const handleApply = (event, picker) => {
    const dateRangeText = picker.startDate.format('MM/DD/YYYY') + ' - ' + picker.endDate.format('MM/DD/YYYY')
    picker.element.val(dateRangeText)
    setDateRangeSearch([picker.startDate, picker.endDate])
  }


  const handleCancel = (event, picker) => {
    picker.element.val('')
    setDateRangeSearch([])
  }

  return (
    <div className="sim-header-row">
      <div className="sr-title-container" style={{ marginRight: '230px' }}>
        <div className="sr-header-title margin-bottom--xxs">Tiêu đề</div>
        <div className="sr-header-title">
          <div className="input-group input-group-sm mb-3">
            <input type="text" autoFocus
              className="form-control" placeholder="Tiêu đề..."
              aria-label="Small" aria-describedby="inputGroup-sizing-sm"
              onChange={(e) => setTitleSearchT(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="header-domain" style={{ width: '120px' }}>
        <div className="margin-bottom--xxs">Tên miền</div>
        <div style={{ paddingRight: "5px" }}>
          <div className="input-group input-group-sm mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Tên miền..."
              aria-label="Small"
              aria-describedby="inputGroup-sizing-sm"
              onChange={(e) => setDomainSearchT(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="header-date" style={{ width: '215px' }}>
        <div className="margin-bottom--xxs">Ngày tháng</div>
        <div style={{ paddingRight: "5px" }}>
          <div className="input-group input-group-sm mb-3">
            <DateRangePicker
              initialSettings={{ autoUpdateInput: false }}
              onApply={handleApply}
              onCancel={handleCancel}>
              <input type="text" className="form-control" placeholder="Ngày tháng..." />
            </DateRangePicker>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeaderRow;
